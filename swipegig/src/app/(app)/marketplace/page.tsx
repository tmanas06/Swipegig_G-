'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { parseEther, createPublicClient, createWalletClient, custom, http } from 'viem';
import { celo } from 'viem/chains';
import { 
  Trophy, 
  Clock, 
  Coins, 
  Plus, 
  Sparkles, 
  ArrowUpDown, 
  X,
  Loader2,
  Lock,
  Gift
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';
import { PostTypeSelector } from '@/components/marketplace/PostTypeSelector';
import { PostCard } from '@/components/marketplace/PostCard';

const PRESET_TAGS = ['Web3', 'Career', 'Tutorial', 'Interview', 'DeFi', 'Solidity', 'Rust', 'Resume', 'Salary'];

const G_TOKEN_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const CREATOR_POOL_ABI = [
  {
    name: 'fundPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const;

function PayoutCountdown({ nextBonusIn }: { nextBonusIn: number }) {
  const [timeLeft, setTimeLeft] = useState(nextBonusIn);

  useEffect(() => {
    setTimeLeft(nextBonusIn);
  }, [nextBonusIn]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  if (timeLeft <= 0) {
    return <span>Payout processing...</span>;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <span>
      {days}d {hours}h {minutes}m
    </span>
  );
}

export default function MarketplaceFeedPage() {
  const { user: privyUser, login } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const { isVerified: isUserVerified, isLoading: isVerificationLoading } = useGoodDollarVerification();

  const [selectedType, setSelectedType] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt' or 'engagementScore'
  const [fundingAmount, setFundingAmount] = useState('');
  const [isFundingOpen, setIsFundingOpen] = useState(false);
  const [fundingStep, setFundingStep] = useState<'idle' | 'approving' | 'funding' | 'success'>('idle');

  // 1. Fetch posts feed
  const { 
    data: feedData, 
    isLoading: isFeedLoading, 
    refetch: refetchFeed 
  } = useQuery({
    queryKey: ['posts-feed', selectedType, selectedTag, sortBy],
    queryFn: async () => {
      const res = await fetch(
        `/api/marketplace/posts?type=${selectedType}&tag=${selectedTag}&sortBy=${sortBy}`
      );
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    },
    refetchInterval: 30000, // refresh feed every 30 seconds
  });

  // 2. Fetch leaderboard & pool stats
  const { 
    data: leaderboardData, 
    isLoading: isLeaderboardLoading,
    refetch: refetchLeaderboard
  } = useQuery({
    queryKey: ['leaderboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/leaderboard');
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    refetchInterval: 300000, // refresh stats every 5 minutes
  });

  // Handle funding pool transaction flow
  const handleFundPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingAmount || isNaN(parseFloat(fundingAmount))) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (!activeWallet) {
      toast.error('Active wallet not found. Connect your wallet first.');
      return;
    }

    const creatorPoolAddress = process.env.NEXT_PUBLIC_CREATOR_POOL_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
    const gTokenAddress = process.env.NEXT_PUBLIC_DEV_G_TOKEN || '0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475';
    
    if (creatorPoolAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Creator pool contract address is not configured.');
      return;
    }

    const loadingToast = toast.loading('Initiating pool funding...');
    try {
      setFundingStep('approving');
      const amountWei = parseEther(fundingAmount);

      // Ensure connected to Celo Mainnet
      await activeWallet.switchChain(42220);
      const provider = await activeWallet.getEthereumProvider();
      
      const publicClient = createPublicClient({
        chain: celo,
        transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'),
      });
      
      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(provider),
      });

      // Step 1: Approve Creator Pool to spend G$
      toast.loading('Approving G$ tokens...', { id: loadingToast });
      const approveHash = await walletClient.writeContract({
        address: gTokenAddress as `0x${string}`,
        abi: G_TOKEN_ABI,
        functionName: 'approve',
        account: activeWallet.address as `0x${string}`,
        args: [creatorPoolAddress as `0x${string}`, amountWei],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Step 2: Trigger fund pool
      setFundingStep('funding');
      toast.loading('Funding Creator Pool...', { id: loadingToast });
      
      const fundHash = await walletClient.writeContract({
        address: creatorPoolAddress as `0x${string}`,
        abi: CREATOR_POOL_ABI,
        functionName: 'fundPool',
        account: activeWallet.address as `0x${string}`,
        args: [amountWei],
      });

      await publicClient.waitForTransactionReceipt({ hash: fundHash });

      setFundingStep('success');
      toast.success(`✓ Pool funded with ${fundingAmount} G$!`, { id: loadingToast });
      setFundingAmount('');
      refetchLeaderboard();
      setTimeout(() => {
        setIsFundingOpen(false);
        setFundingStep('idle');
      }, 1500);
    } catch (err: any) {
      console.error('[FUND_POOL_ERROR]', err);
      toast.error(err.message || 'Transaction failed.', { id: loadingToast });
      setFundingStep('idle');
    }
  };

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-2">
              Creator Marketplace <Sparkles className="w-6 h-6 text-primary" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Write rich tutorials, share screenshots, code snippets, polls, or videos. Earn G$ tips wallet-to-wallet and compete for weekly Creator Pool bonuses.
            </p>
          </div>
          <div>
            {privyUser ? (
              isUserVerified ? (
                <Link
                  href="/marketplace/create"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-hero text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all"
                >
                  <Plus className="w-4 h-4 text-black font-bold" />
                  Create Post
                </Link>
              ) : (
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5 text-green-400 font-bold text-sm transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Verify to Post
                </Link>
              )
            ) : (
              <button
                onClick={() => login()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-hero text-black font-bold text-sm transition-all cursor-pointer"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Feed Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filter Bar */}
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Content Type</p>
                <PostTypeSelector selectedType={selectedType} onChange={setSelectedType} mode="filter" />
              </div>

              <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Tag Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedTag('all')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer border',
                      selectedTag === 'all'
                        ? 'bg-white/10 text-white border-white/15'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All Tags
                  </button>
                  {PRESET_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer border',
                        selectedTag === tag
                          ? 'bg-white/10 text-white border-white/15'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border border-white/10 hover:border-white/20 rounded-xl px-3 py-1.5 text-xs text-muted-foreground focus:text-foreground outline-none cursor-pointer"
                  >
                    <option value="createdAt">Latest Posts</option>
                    <option value="engagementScore">Top Engagement</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Posts Feed */}
            {isFeedLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 4, 5].map((i) => (
                  <div key={i} className="glass rounded-3xl p-6 h-[220px] animate-pulse border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/5 rounded-md w-1/3" />
                        <div className="h-3 bg-white/5 rounded-md w-1/4" />
                      </div>
                    </div>
                    <div className="h-6 bg-white/5 rounded-md w-2/3" />
                    <div className="space-y-2">
                      <div className="h-3.5 bg-white/5 rounded-md w-full" />
                      <div className="h-3.5 bg-white/5 rounded-md w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feedData?.posts && feedData.posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {feedData.posts.map((post: any) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onSaveToggle={refetchFeed}
                  />
                ))}
              </div>
            ) : (
              <div className="glass rounded-3xl p-12 text-center border border-white/5 flex flex-col items-center">
                <span className="text-4xl mb-3">📰</span>
                <h3 className="text-lg font-bold text-white mb-1">No posts found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Be the first creator to share content or try choosing a different type filter.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Pool Stats Card */}
            <div className="glass rounded-3xl p-6 border border-white/5 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                Creator Pool Stats
              </h2>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-bold tracking-wider mb-1">Pool Balance</span>
                  {isLeaderboardLoading ? (
                    <div className="h-7 bg-white/5 w-24 rounded-md animate-pulse" />
                  ) : (
                    <span className="text-2xl font-black text-green-400">
                      {leaderboardData?.creatorPoolBalance?.toFixed(0) || 0} G$
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Next payout:</span>
                  <strong className="text-foreground font-semibold">
                    {leaderboardData?.nextBonusIn ? (
                      <PayoutCountdown nextBonusIn={leaderboardData.nextBonusIn} />
                    ) : (
                      'Calculating...'
                    )}
                  </strong>
                </div>

                <button
                  onClick={() => setIsFundingOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary text-sm font-semibold transition-all cursor-pointer select-none"
                >
                  <Gift className="w-4 h-4" />
                  Fund Creator Pool
                </button>
              </div>
            </div>

            {/* Weekly Top Creators Card */}
            <div className="glass rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  This Week&apos;s Top 3
                </h2>
                <Link href="/marketplace/leaderboard" className="text-xs text-primary hover:underline font-semibold">
                  View All
                </Link>
              </div>

              {isLeaderboardLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-7 h-7 rounded-full bg-white/5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-white/5 rounded-md w-1/2" />
                        <div className="h-2.5 bg-white/5 rounded-md w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : leaderboardData?.currentWeekTopCreators && leaderboardData.currentWeekTopCreators.length > 0 ? (
                <div className="space-y-3">
                  {leaderboardData.currentWeekTopCreators.slice(0, 3).map((item: any, i: number) => (
                    <div 
                      key={item.creator.id} 
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn(
                          'text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 border select-none',
                          i === 0 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          i === 1 ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' :
                          'bg-amber-600/10 text-amber-500 border-amber-600/20'
                        )}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-white truncate block">
                            {item.creator.name || 'Anonymous'}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Score: {item.score}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-green-400">
                        +{item.tipsEarned.toFixed(0)} G$
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">No creators active this week yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fund Pool Dialog Modal */}
      {isFundingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="glass rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-white/10 relative">
            <button
              onClick={() => setIsFundingOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">Fund the Creator Pool</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Support the builder community by adding G$ tokens to the Creator Pool. These tokens fund weekly rewards for active job coaches and technical writers.
            </p>

            <form onSubmit={handleFundPool} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">G$ Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={fundingAmount}
                    onChange={(e) => setFundingAmount(e.target.value)}
                    placeholder="e.g. 50"
                    disabled={fundingStep !== 'idle'}
                    className="w-full glass rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-white font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-green-400 select-none">G$</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={fundingStep !== 'idle'}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {fundingStep === 'approving' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving tokens...
                  </>
                )}
                {fundingStep === 'funding' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Funding pool...
                  </>
                )}
                {fundingStep === 'success' && '✓ Successfully Funded!'}
                {fundingStep === 'idle' && 'Fund Pool'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
