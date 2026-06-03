'use client';

import { Shield, AlertTriangle } from 'lucide-react';

interface VerificationStatusBadgeProps {
  isVerified: boolean;
  verifiedAt?: Date | null;
  expiresAt?: Date | null;
  isExpiringSoon?: boolean;
  onVerifyClick: () => void;
}

export default function VerificationStatusBadge({
  isVerified,
  verifiedAt,
  expiresAt,
  isExpiringSoon = false,
  onVerifyClick,
}: VerificationStatusBadgeProps) {

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isVerified) {
    if (isExpiringSoon) {
      // Verified + expiring soon (< 14 days)
      return (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-semibold cursor-default select-none"
          title={`Expires ${formatDate(expiresAt)} · Re-verify at GoodWallet`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>⚠ Re-verify Soon</span>
        </div>
      );
    }

    // Verified + not expiring soon
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-semibold cursor-default select-none"
        title={verifiedAt ? `Verified ${formatDate(verifiedAt)}` : 'Verified'}
      >
        <Shield className="w-3.5 h-3.5" />
        <span>✓ GoodDollar Verified</span>
      </div>
    );
  }

  // Not verified
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onVerifyClick();
      }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-xs text-amber-400 font-semibold transition-colors cursor-pointer"
      title="Complete GoodDollar face verification to unlock rewards & wallet"
    >
      <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
      <span>⚠ Verify Identity</span>
    </button>
  );
}
