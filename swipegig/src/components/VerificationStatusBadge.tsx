'use client';

import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle } from 'lucide-react';

interface VerificationStatusBadgeProps {
  isVerified: boolean;
  verifiedAt?: Date | null;
  compact?: boolean;
}

export default function VerificationStatusBadge({
  isVerified,
  verifiedAt,
  compact = false,
}: VerificationStatusBadgeProps) {
  const router = useRouter();

  if (isVerified) {
    const formattedDate = verifiedAt
      ? verifiedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

    return (
      <div
        className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 cursor-default"
        title={formattedDate ? `Verified on ${formattedDate} · Sybil-resistant identity` : 'GoodDollar Verified'}
      >
        <Shield className="w-3.5 h-3.5 text-green-400" />
        {!compact && (
          <span className="text-xs text-green-400 font-medium whitespace-nowrap">
            GoodDollar Verified
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push('/settings')}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors cursor-pointer"
      title="Complete GoodDollar face verification to unlock rewards & wallet"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      {!compact && (
        <span className="text-xs text-amber-400 font-medium whitespace-nowrap">
          Verify Identity
        </span>
      )}
    </button>
  );
}
