'use client';

import { Shield, AlertTriangle, Send } from 'lucide-react';

interface AiPromptCounterProps {
  used: number;
  limit: number;
  isVerified: boolean;
  onVerifyClick: () => void;
}

export default function AiPromptCounter({
  used,
  limit,
  isVerified,
  onVerifyClick,
}: AiPromptCounterProps) {
  const remaining = Math.max(0, limit - used);

  // STATE 1 — Verified
  if (isVerified) {
    return (
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-semibold select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Unlimited · GoodDollar Verified ✓
      </div>
    );
  }

  // STATE 4 — Unverified, 0 remaining
  if (remaining === 0) {
    return (
      <div className="w-full space-y-4">
        {/* Banner Card */}
        <div className="w-full glass rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 text-center flex flex-col items-center">
          <p className="text-sm font-semibold text-white mb-1">
            You&apos;ve used all {limit} free AI prompts
          </p>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Verify with GoodDollar to unlock unlimited career coaching — free.
          </p>
          <button
            onClick={onVerifyClick}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-xs hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Verify with GoodDollar →
          </button>
        </div>

        {/* Disabled, grayed-out chat input below */}
        <div className="relative opacity-30 pointer-events-none select-none">
          <textarea
            disabled
            placeholder="Ask me about your career, resume, interviews..."
            rows={1}
            className="w-full glass rounded-2xl px-5 py-3.5 pr-14 text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50 bg-transparent border border-white/10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-muted-foreground">
            <Send className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // STATE 3 — Unverified, 1-2 remaining
  if (remaining <= 2) {
    return (
      <button
        onClick={onVerifyClick}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-xs text-amber-400 font-semibold animate-pulse transition-all cursor-pointer"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>⚠ {remaining} prompt{remaining === 1 ? '' : 's'} left · Verify to unlock unlimited →</span>
      </button>
    );
  }

  // STATE 2 — Unverified, > 2 remaining
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 select-none">
      <Shield className="w-3.5 h-3.5 text-gray-500" />
      <span>{remaining} of {limit} free prompts remaining</span>
    </div>
  );
}
