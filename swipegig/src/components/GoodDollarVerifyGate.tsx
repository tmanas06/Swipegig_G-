'use client';

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, CheckCircle, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';
import { useCheckGoodDollarStatus } from '@/hooks/useCheckGoodDollarStatus';
import { GOODDOLLAR_WALLET_URL, VERIFY_GATE_DESCRIPTIONS } from '@/lib/gooddollar/constants';

type FeatureKey = 'wallet' | 'rewards' | 'pool' | 'marketplace';

interface GoodDollarVerifyGateProps {
  children: ReactNode;
  feature: FeatureKey;
}

function CheckStatusPanel() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const { checkStatus, isChecking, result, message, error } = useCheckGoodDollarStatus();

  const handleCheck = () => {
    if (walletAddress) {
      checkStatus(walletAddress);
    }
  };

  return (
    <div className="mt-4 w-full">
      {/* Check Status Button */}
      {result !== 'verified' && (
        <button
          onClick={handleCheck}
          disabled={isChecking || !walletAddress}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking on-chain status...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              {result ? 'Check Again' : 'Already verified? Check My Status'}
            </>
          )}
        </button>
      )}

      {/* Result States */}
      {result === 'verified' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">Verified! Unlocking features...</span>
        </motion.div>
      )}

      {result === 'not_verified' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{message || 'Verification not found yet. Complete face scan at wallet.gooddollar.org first.'}</span>
        </motion.div>
      )}

      {result === 'expired' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{message || 'Your verification has expired. Please re-verify.'}</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span>{error}</span>
            <button
              onClick={handleCheck}
              className="block mt-1 text-xs underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </motion.div>
      )}

      {!walletAddress && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Connect a wallet first to check your verification status.
        </p>
      )}
    </div>
  );
}

export default function GoodDollarVerifyGate({ children, feature }: GoodDollarVerifyGateProps) {
  const { isVerified, isLoading } = useGoodDollarVerification();
  const [showCheckPanel, setShowCheckPanel] = useState(false);

  const featureInfo = VERIFY_GATE_DESCRIPTIONS[feature] || {
    title: 'Verify Your Identity',
    description: 'Complete GoodDollar verification to unlock this feature.',
  };

  // Loading state — skeleton
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Verified — render children normally
  if (isVerified) {
    return <>{children}</>;
  }

  // Not verified — blur + overlay
  return (
    <div className="relative min-h-[400px]">
      {/* Blurred children preview */}
      <div className="blur-sm opacity-40 pointer-events-none select-none" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-6 text-center"
        >
          {/* GoodDollar icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🌍</span>
          </div>

          <h3 className="text-xl font-bold mb-2">{featureInfo.title}</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-sm mx-auto">
            {featureInfo.description}
          </p>

          {/* Verify Button */}
          <button
            onClick={() => {
              window.open(GOODDOLLAR_WALLET_URL, '_blank');
              setShowCheckPanel(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Verify with GoodDollar
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Subtext */}
          <p className="text-xs text-muted-foreground/60 mt-3">
            Takes ~2 minutes · Powered by GoodDollar PoH · Free forever
          </p>

          {/* Check Status Panel */}
          {showCheckPanel && <CheckStatusPanel />}

          {/* Always show check option */}
          {!showCheckPanel && (
            <button
              onClick={() => setShowCheckPanel(true)}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
            >
              Already verified? Check your status
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
