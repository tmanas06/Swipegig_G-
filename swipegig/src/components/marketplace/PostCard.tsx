'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  Bookmark, 
  Gift, 
  Lock, 
  ShieldCheck, 
  BookOpen, 
  Image as ImageIcon, 
  Code as CodeIcon, 
  BarChart3, 
  Play, 
  Heart 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'react-hot-toast';
import { TipButton } from './TipButton';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    type: 'article' | 'image' | 'code' | 'poll' | 'video';
    content: string | null;
    mediaUrl: string | null;
    tags: string[];
    viewCount: number;
    tipTotal: number;
    saveCount: number;
    createdAt: string;
    author: {
      id: string;
      name: string | null;
      avatarUrl: string | null;
      isGoodDollarVerified: boolean;
      walletAddress: string | null;
    };
    saves: { userId: string }[];
  };
  onSaveToggle?: (postId: string, saved: boolean) => void;
}

const typeIcons = {
  article: BookOpen,
  image: ImageIcon,
  code: CodeIcon,
  poll: BarChart3,
  video: Play,
};

const typeColors = {
  article: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  image: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  code: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  poll: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  video: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export function PostCard({ post, onSaveToggle }: PostCardProps) {
  const { user: privyUser } = usePrivy();
  const { isVerified: isUserVerified } = useGoodDollarVerification();
  
  const [tipTotal, setTipTotal] = useState(post.tipTotal);
  const [showTipOptions, setShowTipOptions] = useState(false);
  
  const isSavedInitial = privyUser && post.saves.some((s) => s.userId === privyUser.id);
  const [isSaved, setIsSaved] = useState(!!isSavedInitial);
  const [saveCount, setSaveCount] = useState(post.saveCount);
  const [isSaving, setIsSaving] = useState(false);

  const TypeIcon = typeIcons[post.type] || BookOpen;

  // Truncate rich text helper
  const getContentPreview = () => {
    if (!post.content) return '';
    if (post.type === 'code') {
      try {
        const parsed = JSON.parse(post.content);
        return parsed.code || post.content;
      } catch {
        return post.content;
      }
    }
    // Simple HTML tag stripper
    const plainText = post.content.replace(/<[^>]*>/g, '');
    return plainText.length > 150 ? `${plainText.substring(0, 150)}...` : plainText;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!privyUser) {
      toast.error('Connect your wallet to save posts.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/marketplace/posts/${post.id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': privyUser.id,
        },
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      
      setIsSaved(data.saved);
      setSaveCount((prev) => (data.saved ? prev + 1 : Math.max(0, prev - 1)));
      toast.success(data.saved ? 'Post saved!' : 'Post unsaved!');
      if (onSaveToggle) onSaveToggle(post.id, data.saved);
    } catch (err) {
      toast.error('Failed to save post.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTipClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUserVerified) {
      toast.error('You must be GoodDollar verified to tip creators.');
      return;
    }
    setShowTipOptions(!showTipOptions);
  };

  return (
    <div className="glass rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between group h-full">
      <Link href={`/marketplace/post/${post.id}`} className="block flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-primary border border-white/10 text-sm shrink-0">
              {post.author.avatarUrl ? (
                <img 
                  src={post.author.avatarUrl} 
                  alt={post.author.name || 'Avatar'} 
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                post.author.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm text-foreground truncate max-w-[120px] sm:max-w-none">
                  {post.author.name || 'Anonymous'}
                </span>
                {post.author.isGoodDollarVerified && (
                  <span title="GoodDollar Verified Human" className="inline-flex">
                    <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground block">
                {new Date(post.createdAt).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>

          {/* Type Badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border select-none',
            typeColors[post.type]
          )}>
            <TypeIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{post.type}</span>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
            {getContentPreview()}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {post.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag} 
              className="text-[10px] px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              #{tag}
            </span>
          ))}
          {post.tags.length > 3 && (
            <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-muted-foreground font-medium">
              +{post.tags.length - 3} more
            </span>
          )}
        </div>
      </Link>

      {/* Footer / Stats & Interactivity */}
      <div className="border-t border-white/5 pt-4">
        <div className="flex items-center justify-between">
          {/* Left Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1" title="Views">
              <Eye className="w-4 h-4" />
              <span>{post.viewCount}</span>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer",
                isSaved && "text-orange-400 hover:text-orange-300"
              )}
              title="Save Post"
            >
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              <span>{saveCount}</span>
            </button>
            <div className="flex items-center gap-1 text-green-400" title="Total G$ Earned from Tips">
              <Gift className="w-4 h-4" />
              <span>{tipTotal.toFixed(0)} G$</span>
            </div>
          </div>

          {/* Right Action */}
          <div>
            {isUserVerified ? (
              <button 
                onClick={handleTipClick}
                className="flex items-center gap-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Tip G$</span>
              </button>
            ) : (
              <div 
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 text-xs text-muted-foreground select-none opacity-60"
                title="Only GoodDollar verified users can tip creators"
              >
                <Lock className="w-3 h-3" />
                <span>Tip locked</span>
              </div>
            )}
          </div>
        </div>

        {/* Tipping Panel Dropdown */}
        {showTipOptions && isUserVerified && post.author.walletAddress && (
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 animate-slide-down">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Select tip amount (G$)</p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map((amt) => (
                <TipButton
                  key={amt}
                  postId={post.id}
                  authorWallet={post.author.walletAddress!}
                  amount={amt}
                  onTipSuccess={(newTotal) => {
                    setTipTotal(newTotal);
                    setShowTipOptions(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
