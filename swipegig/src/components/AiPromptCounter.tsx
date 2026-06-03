'use client';

import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import { GOODDOLLAR_WALLET_URL } from '@/lib/gooddollar/constants';

interface AiPromptCounterProps {
  used: number;
  limit: number;
  isVerified: boolean;
}

export default function AiPromptCounter({ used, limit, isVerified }: AiPromptCounterProps) {
  const remaining = Math.max(0, limit - used);

  // Verified user — unlimited
  if (isVerified) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs text-green-400 font-medium">
          Unlimited · GoodDollar Verified ✓
        </span>
      </div>
    );
  }

  // Unverified, prompts exhausted
  if (remaining === 0) {
    return (
      <div className="w-full glass rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-1">
              You&apos;ve used all {limit} free AI prompts
            </p>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Verify with GoodDollar to unlock unlimited career coaching — free.
            </p>
            <button
              onClick={() => window.open(GOODDOLLAR_WALLET_URL, '_blank')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-xs hover:shadow-lg hover:shadow-green-500/20 transition-all cursor-pointer"
            >
              Verify Now
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unverified, prompts low (≤ 2)
  if (remaining <= 2) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span className="text-xs text-amber-400 font-medium">
          {remaining} prompt{remaining === 1 ? '' : 's'} left · Verify to unlock unlimited
        </span>
      </div>
    );
  }

  // Unverified, prompts remaining (> 2)
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
      <Shield className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        {remaining} of {limit} free prompts remaining
      </span>
    </div>
  );
}
