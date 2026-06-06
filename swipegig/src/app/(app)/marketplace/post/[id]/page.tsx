'use client';

import { useState, use, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Eye, 
  Bookmark, 
  Gift, 
  Lock, 
  ShieldCheck, 
  Calendar, 
  User, 
  Copy, 
  Check, 
  Hourglass,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';
import { VideoPlayer } from '@/components/marketplace/VideoPlayer';
import { TipButton } from '@/components/marketplace/TipButton';

// Dynamic import syntax highlighter to prevent SSR issues
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function SinglePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user: privyUser } = usePrivy();
  const { isVerified: isUserVerified } = useGoodDollarVerification();
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch main post details
  const { 
    data: post, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['post-detail', id],
    queryFn: async () => {
      const headers: any = {};
      if (privyUser?.id) {
        headers['x-privy-user-id'] = privyUser.id;
      }
      const res = await fetch(`/api/marketplace/posts/${id}`, { headers });
      if (!res.ok) throw new Error('Post not found');
      return res.json();
    },
    enabled: !!id,
  });

  // 2. Fetch author's other posts
  const { data: otherPostsData } = useQuery({
    queryKey: ['author-other-posts', post?.authorId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/posts?authorId=${post.authorId}&limit=3`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!post?.authorId,
  });

  const otherPosts = otherPostsData?.posts?.filter((p: any) => p.id !== post?.id).slice(0, 3) || [];

  // Poll expiry check
  const getPollExpiry = () => {
    if (!post) return { expired: true, text: 'Expired' };
    const expiry = new Date(new Date(post.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    const diff = expiry.getTime() - Date.now();
    if (diff <= 0) return { expired: true, text: 'Expired' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { expired: false, text: `Expires in ${days}d ${hours}h` };
  };

  const pollStatus = getPollExpiry();

  // Copy code helper
  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Vote helper
  const handleVote = async (optionId: string) => {
    if (!privyUser) {
      toast.error('Connect your wallet to vote.');
      return;
    }
    if (!isUserVerified) {
      toast.error('Only GoodDollar verified humans can vote on polls.');
      return;
    }
    if (isVoting) return;

    setIsVoting(true);
    try {
      const res = await fetch(`/api/marketplace/posts/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': privyUser.id,
        },
        body: JSON.stringify({ optionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to vote');
      }

      toast.success('Vote recorded!');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cast vote.');
    } finally {
      setIsVoting(false);
    }
  };

  // Save/Unsave post helper
  const handleToggleSave = async () => {
    if (!privyUser) {
      toast.error('Connect your wallet to save posts.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/marketplace/posts/${id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': privyUser.id,
        },
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(data.saved ? 'Post saved!' : 'Post unsaved!');
      refetch();
    } catch (err) {
      toast.error('Failed to update save status.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-semibold">Loading post details...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <span className="text-4xl mb-4">🔍</span>
        <h2 className="text-xl font-bold text-white mb-2">Post not found</h2>
        <p className="text-sm text-muted-foreground mb-6">The post may have been deleted or does not exist.</p>
        <Link href="/marketplace" className="px-5 py-2.5 rounded-xl gradient-hero text-black font-bold text-sm">
          Return to Feed
        </Link>
      </div>
    );
  }

  // Parse code snippet if type === code
  let parsedCode = '';
  let parsedLanguage = 'javascript';
  if (post.type === 'code' && post.content) {
    try {
      const json = JSON.parse(post.content);
      parsedCode = json.code || post.content;
      parsedLanguage = json.language || 'javascript';
    } catch {
      parsedCode = post.content;
    }
  }

  // Total poll votes calculation
  const totalVotes = post.pollOptions.reduce((acc: number, cur: any) => acc + cur.voteCount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {/* Navigation */}
        <Link 
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>

        {/* Content Wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Post Section */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Post Layout */}
            <article className="glass rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6 min-w-0 overflow-hidden">
              {/* Post Meta */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-primary border border-white/10 shrink-0">
                    {post.author.avatarUrl ? (
                      <img src={post.author.avatarUrl} alt={post.author.name || ''} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      post.author.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white text-sm">{post.author.name || 'Anonymous'}</span>
                      {post.author.isGoodDollarVerified && (
                        <span title="GoodDollar Verified Human" className="inline-flex">
                          <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Save Button */}
                  <button
                    onClick={handleToggleSave}
                    disabled={isSaving}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all cursor-pointer',
                      post.hasSaved
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
                        : 'glass border-white/5 text-muted-foreground hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Bookmark className={cn('w-4 h-4', post.hasSaved && 'fill-current')} />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {post.title}
              </h1>

              {/* Content Box - changes by type */}
              <div className="text-foreground text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                {/* 1. Article */}
                {post.type === 'article' && post.content && (
                  <div 
                    className="prose prose-invert max-w-none prose-sm sm:prose-base prose-headings:font-bold prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                )}

                {/* 2. Image */}
                {post.type === 'image' && post.mediaUrl && (
                  <div className="space-y-4">
                    <div className="rounded-2xl overflow-hidden border border-white/5 max-h-[500px] bg-black/20 flex justify-center">
                      <img src={post.mediaUrl} alt={post.title} className="w-full object-contain" />
                    </div>
                    {post.content && (
                      <p className="text-sm text-muted-foreground italic border-l-2 border-white/10 pl-3 leading-relaxed">
                        {post.content}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Code snippet */}
                {post.type === 'code' && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10">
                    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/5 text-xs text-muted-foreground font-mono">
                      <span>{parsedLanguage}</span>
                      <button
                        onClick={() => handleCopyCode(parsedCode)}
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <SyntaxHighlighter
                      language={parsedLanguage}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: '16px',
                        background: '#0d0d0d',
                        fontSize: '13px',
                      }}
                    >
                      {parsedCode}
                    </SyntaxHighlighter>
                  </div>
                )}

                {/* 4. Poll UI */}
                {post.type === 'poll' && (
                  <div className="space-y-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 select-none">
                      <span className="flex items-center gap-1">
                        <Hourglass className="w-3.5 h-3.5" />
                        {pollStatus.text}
                      </span>
                      <span>{totalVotes} total votes</span>
                    </div>

                    <div className="space-y-3">
                      {post.pollOptions.map((opt: any) => {
                        const percent = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                        const hasVoted = post.userVote === opt.id;
                        const showResults = post.userVote !== null || pollStatus.expired;

                        if (showResults) {
                          return (
                            <div 
                              key={opt.id}
                              className={cn(
                                'relative p-4 rounded-xl border overflow-hidden bg-white/[0.02] border-white/5',
                                hasVoted && 'border-primary/30 bg-primary/[0.02]'
                              )}
                            >
                              {/* Background progress bar */}
                              <div 
                                className={cn(
                                  'absolute inset-y-0 left-0 bg-white/5 pointer-events-none transition-all duration-1000',
                                  hasVoted && 'bg-primary/10'
                                )}
                                style={{ width: `${percent}%` }}
                              />
                              <div className="relative flex justify-between items-center text-sm font-semibold text-white">
                                <span className="flex items-center gap-2">
                                  {opt.text}
                                  {hasVoted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">Your vote</span>}
                                </span>
                                <span>{percent}% ({opt.voteCount})</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={opt.id}
                            disabled={isVoting}
                            onClick={() => handleVote(opt.id)}
                            className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-sm font-semibold text-white transition-all cursor-pointer flex justify-between items-center outline-none select-none"
                          >
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Video Player */}
                {post.type === 'video' && post.mediaUrl && (
                  <VideoPlayer playbackId={post.mediaUrl} />
                )}
              </div>

              {/* Tags list */}
              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-white/5 select-none">
                {post.tags.map((tag: string) => (
                  <span 
                    key={tag} 
                    className="text-xs px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-muted-foreground hover:text-white transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </article>

            {/* Author's other posts */}
            {otherPosts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">Other posts from {post.author.name || 'this creator'}</h3>
                <div className="grid grid-cols-1 gap-3.5">
                  {otherPosts.map((other: any) => (
                    <Link 
                      key={other.id}
                      href={`/marketplace/post/${other.id}`}
                      className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-sm text-white line-clamp-1 block mb-1">{other.title}</span>
                        <span className="text-[10px] text-muted-foreground block capitalize">{other.type} · {new Date(other.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg shrink-0">
                        {other.tipTotal.toFixed(0)} G$
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Tips Panel */}
          <div className="space-y-6">
            {/* Tipping Card */}
            <div className="glass rounded-3xl p-6 border border-white/5 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-400" />
                Support Creator
              </h2>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">Tipped Total</span>
                  <span className="text-2xl font-black text-green-400">{post.tipTotal.toFixed(0)} G$</span>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-3">
                  {isUserVerified ? (
                    post.author.walletAddress ? (
                      <>
                        <p className="text-xs text-muted-foreground">Select G$ tip amount:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 5, 10].map((amt) => (
                            <TipButton
                              key={amt}
                              postId={post.id}
                              authorWallet={post.author.walletAddress!}
                              amount={amt}
                              onTipSuccess={() => refetch()}
                            />
                          ))}
                        </div>

                        {!showCustomTip ? (
                          <button
                            onClick={() => setShowCustomTip(true)}
                            className="w-full text-center text-xs font-bold text-primary hover:underline cursor-pointer select-none"
                          >
                            Custom Tip Amount
                          </button>
                        ) : (
                          <div className="space-y-2 animate-slide-down">
                            <div className="relative">
                              <input
                                type="number"
                                value={customTip}
                                onChange={(e) => setCustomTip(e.target.value)}
                                placeholder="Custom amount"
                                className="w-full glass rounded-xl pl-4 pr-12 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-white"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-green-400">G$</span>
                            </div>
                            <div className="flex gap-2">
                              <TipButton
                                postId={post.id}
                                authorWallet={post.author.walletAddress!}
                                amount={parseFloat(customTip) || 0}
                                onTipSuccess={(newTotal) => {
                                  refetch();
                                  setCustomTip('');
                                  setShowCustomTip(false);
                                }}
                              />
                              <button
                                onClick={() => setShowCustomTip(false)}
                                className="px-3 py-2 rounded-xl text-xs font-semibold glass text-muted-foreground hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-amber-400">This creator does not have a wallet address linked to receive G$ tips.</p>
                    )
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center gap-2">
                      <Lock className="w-6 h-6 text-muted-foreground opacity-60" />
                      <span className="text-xs font-bold text-white">Tipping locked</span>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Only GoodDollar verified human readers can tip posts directly. Link your GoodWallet in Settings to unlock.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Tips List */}
            <div className="glass rounded-3xl p-6 border border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-white">Recent Tips</h3>
              {post.tips && post.tips.length > 0 ? (
                <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                  {post.tips.map((tip: any) => (
                    <div key={tip.id} className="flex justify-between items-start gap-2 text-xs">
                      <div>
                        <span className="font-semibold text-white block">
                          {tip.from.name || (tip.from.walletAddress ? `${tip.from.walletAddress.slice(0, 6)}...${tip.from.walletAddress.slice(-4)}` : 'Anonymous')}
                        </span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">
                          {new Date(tip.createdAt).toLocaleString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <span className="font-extrabold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg shrink-0">
                        {tip.amount} G$
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic select-none">No tips received yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
