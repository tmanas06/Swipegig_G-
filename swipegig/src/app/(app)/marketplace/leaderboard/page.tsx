'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { parseEther, createPublicClient, createWalletClient, custom, http } from 'viem';
import { celo } from 'viem/chains';
import { 
  ArrowLeft, 
  Trophy, 
  Coins, 
  Clock, 
  Sparkles, 
  User, 
  ShieldCheck, 
  Gift, 
  X, 
  Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';

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

export default function LeaderboardPage() {
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const { isVerified: isUserVerified } = useGoodDollarVerification();
  const [activeTab, setActiveTab] = useState<'thisWeek' | 'allTime'>('thisWeek');
  
  const [fundingAmount, setFundingAmount] = useState('');
  const [isFundingOpen, setIsFundingOpen] = useState(false);
  const [fundingStep, setFundingStep] = useState<'idle' | 'approving' | 'funding' | 'success'>('idle');

  // Fetch stats & leaderboards
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard-full-stats'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/leaderboard');
      if (!res.ok) throw new Error();
      return res.json();
    },
    refetchInterval: 30000, // refresh stats every 30s
  });

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
      toast.error('Creator pool address not configured.');
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
      refetch();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-semibold">Loading Leaderboard rankings...</p>
        </div>
      </div>
    );
  }

  const tableData = activeTab === 'thisWeek' 
    ? stats?.currentWeekTopCreators || [] 
    : stats?.allTimeTopCreators || [];

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {/* Navigation */}
        <Link 
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>

        {/* Title */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-2.5">
              Creator Standings <Trophy className="w-7 h-7 text-yellow-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Earn engagement points for views, saves, and G$ tips. Every Monday at 00:00 UTC, the top 3 creators receive bonuses from the Creator Pool.
            </p>
          </div>
          <div>
            <button
              onClick={() => setIsFundingOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-hero text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              Fund Pool
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-2">Pool Balance</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-green-400">
                {stats?.creatorPoolBalance?.toFixed(0) || 0}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">G$</span>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-2">Total Distributed</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-primary">
                {stats?.totalDistributed?.toFixed(0) || 0}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">G$</span>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-2">Next Distribution In</span>
            <div className="flex items-center gap-2 text-xl font-bold text-white">
              <Clock className="w-5 h-5 text-primary" />
              {stats?.nextBonusIn ? (
                <PayoutCountdown nextBonusIn={stats.nextBonusIn} />
              ) : (
                'Calculating...'
              )}
            </div>
          </div>
        </div>

        {/* Last Week Winners */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-white/5 mb-10 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            🥇 Last Week&apos;s Winners
          </h2>

          {stats?.lastWeekWinners && stats.lastWeekWinners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.lastWeekWinners.map((winner: any) => {
                const medals = ['🥇', '🥈', '🥉'];
                const rankLabels = ['1st Place', '2nd Place', '3rd Place'];
                const rankColors = [
                  'from-yellow-500/20 to-amber-600/20 border-yellow-500/30 text-yellow-400',
                  'from-slate-300/20 to-slate-400/20 border-slate-300/30 text-slate-200',
                  'from-amber-600/20 to-amber-800/20 border-amber-700/30 text-amber-500',
                ];

                return (
                  <div 
                    key={winner.rank}
                    className={cn(
                      'rounded-2xl p-5 border bg-gradient-to-br flex flex-col items-center text-center justify-between',
                      rankColors[winner.rank - 1]
                    )}
                  >
                    <span className="text-3xl mb-1.5">{medals[winner.rank - 1]}</span>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">
                        {rankLabels[winner.rank - 1]}
                      </span>
                      <span className="font-extrabold text-white text-base block mt-1">
                        {winner.creator.name || 'Anonymous'}
                      </span>
                      <span className="text-[11px] opacity-70 block mt-0.5">
                        Engagement Score: {winner.score}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 w-full flex flex-col items-center gap-1">
                      <span className="text-sm font-black text-white">+{winner.amount} G$ Reward</span>
                      {winner.txHash && (
                        <a
                          href={`https://celoscan.io/tx/${winner.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] underline opacity-50 hover:opacity-100 transition-opacity"
                        >
                          View Receipt
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic select-none">No bonus payouts recorded for last week yet.</p>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab('thisWeek')}
            className={cn(
              'px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none',
              activeTab === 'thisWeek'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            This Week&apos;s Standings
          </button>
          <button
            onClick={() => setActiveTab('allTime')}
            className={cn(
              'px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none',
              activeTab === 'allTime'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            All-Time Leaderboard
          </button>
        </div>

        {/* Leaderboard Standings Table */}
        <div className="glass rounded-3xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Creator</th>
                  <th className="py-4 px-6">Engagement Score</th>
                  <th className="py-4 px-6">G$ Tips Received</th>
                  <th className="py-4 px-6">Posts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-foreground">
                {tableData.length > 0 ? (
                  tableData.map((row: any, i: number) => (
                    <tr 
                      key={row.creator.id}
                      className={cn(
                        'hover:bg-white/[0.01] transition-colors',
                        row.creator.id === privyUser?.id && 'bg-primary/[0.02]'
                      )}
                    >
                      <td className="py-4.5 px-6 font-bold">
                        {i === 0 ? '🥇 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : `${i + 1}`}
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                            {row.creator.avatarUrl ? (
                              <img src={row.creator.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              row.creator.name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate max-w-[150px] sm:max-w-none">
                              {row.creator.name || 'Anonymous'}
                              {row.creator.id === privyUser?.id && (
                                <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">You</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-6 font-semibold">{row.score}</td>
                      <td className="py-4.5 px-6 font-semibold text-green-400">
                        {row.tipsEarned.toFixed(0)} G$
                      </td>
                      <td className="py-4.5 px-6 text-muted-foreground">{row.postsCount} posts</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                      No creator activity recorded in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
