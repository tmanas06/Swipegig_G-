'use client';

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, ExternalLink } from 'lucide-react';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';
import { useCheckGoodDollarStatus } from '@/hooks/useCheckGoodDollarStatus';

import { useWallets } from '@privy-io/react-auth';
import { toast } from 'react-hot-toast';

const descriptions = {
  wallet: 'Access your G$ wallet and track your token earnings',
  rewards: 'Earn G$ tokens for applying to jobs, getting interviews, and growing your career',
  pool: 'Join the Job Seekers Pool and receive a daily G$ stream while you job hunt',
  marketplace: 'Post career content, earn G$ from views, and get discovered by top recruiters',
} as const;

interface GoodDollarVerifyGateProps {
  children: ReactNode;
  feature: 'wallet' | 'rewards' | 'pool' | 'marketplace';
}

export default function GoodDollarVerifyGate({ children, feature }: GoodDollarVerifyGateProps) {
  const { isVerified, isLoading } = useGoodDollarVerification();
  const { mutate: checkStatus, isPending } = useCheckGoodDollarStatus();
  const { wallets } = useWallets();

  const [step, setStep] = useState<'idle' | 'verifying' | 'checking'>('idle');
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<'verified' | 'not_verified' | 'expired' | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const activeWallet = wallets[0];

  const handleOpenWallet = () => {
    // Open the GoodDollar Connect Account Tool directly in a new tab
    window.open('https://codesandbox.io/embed/h3n3kp?view=preview&hidenavigation=1&hideexplorer=1', '_blank');
    setStep('verifying');
  };

  const handleCheck = () => {
    setCheckError(null);
    setResultMessage(null);
    setCheckResult(null);

    checkStatus(undefined, {
      onSuccess: (data) => {
        if (data.verified) {
          setCheckResult('verified');
          setResultMessage('Verification successful! Your identity is now linked.');
        } else {
          setCheckResult(data.reason as 'not_verified' | 'expired');
          setResultMessage(data.message || 'Could not verify.');
        }
      },
      onError: (err) => {
        setCheckError(err.message || 'Could not reach GoodDollar network.');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking verification status...</p>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-semibold whitespace-nowrap backdrop-blur-sm select-none">
          ✓ GoodDollar Verified
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen">
      {/* Blurred children preview */}
      <div className="blur-md opacity-35 pointer-events-none select-none w-full h-full" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass rounded-3xl p-6 sm:p-8 border border-white/10 text-center flex flex-col items-center"
        >
          {/* 🌍 green circle icon */}
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl mb-5 shadow-inner shadow-green-500/10 animate-pulse">
            🌍
          </div>

          <h3 className="text-xl font-semibold text-white mb-2">Verify your identity</h3>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed max-w-sm">
            {descriptions[feature] || 'Verify your unique human identity to access this premium feature.'}
          </p>

          <div className="w-full space-y-5">
            {/* Step 1 */}
            <div className="text-left w-full">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">── Step 1 ──</p>
              <p className="text-sm text-white mb-3">Complete face verification on GoodWallet</p>
              <button
                onClick={handleOpenWallet}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5 text-green-400 font-semibold text-sm transition-all cursor-pointer"
              >
                Open GoodWallet →
              </button>
            </div>

            {/* Step 2 — just a button, no address input */}
            {step === 'verifying' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-left w-full space-y-3"
              >
                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">── Step 2 ──</p>
                <p className="text-sm text-white mb-2">
                  After completing face verification, click below to link it.
                </p>

                <button
                  onClick={handleCheck}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-500/20 disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Verification...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Check My Verification
                    </>
                  )}
                </button>

                {/* Feedback messages */}
                {checkError && (
                  <p className="text-xs text-red-500 mt-1.5">{checkError}</p>
                )}

                {checkResult === 'verified' && resultMessage && (
                  <p className="text-xs text-green-400 mt-1.5 leading-relaxed">{resultMessage}</p>
                )}

                {checkResult === 'not_verified' && resultMessage && (
                  <p className="text-xs text-red-500 mt-1.5 leading-relaxed">{resultMessage}</p>
                )}

                {checkResult === 'expired' && resultMessage && (
                  <p className="text-xs text-amber-500 mt-1.5 leading-relaxed">{resultMessage}</p>
                )}

              </motion.div>
            )}
          </div>

          {activeWallet && (
            <div className="w-full mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-left space-y-2.5">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Your SwipeGig Wallet address</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <code className="text-xs font-mono text-green-400 break-all">{activeWallet.address}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeWallet.address);
                      toast.success('Address copied!');
                    }}
                    className="text-xs text-green-400 hover:text-green-300 font-semibold underline cursor-pointer shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="pt-2.5 border-t border-white/5">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Already verified in GoodWallet on another account? Do not scan again. Instead, link this SwipeGig address using the{' '}
                  <a
                    href="https://codesandbox.io/embed/h3n3kp?view=preview&hidenavigation=1&hideexplorer=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline font-semibold"
                  >
                    GoodDollar Connect Account Tool →
                  </a>
                </p>
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-500 mt-6 select-none">
            Takes ~2 min · Free forever
          </p>
        </motion.div>
      </div>
    </div>
  );
}
