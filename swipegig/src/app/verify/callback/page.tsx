'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useCheckGoodDollarStatus } from '@/hooks/useCheckGoodDollarStatus';
import confetti from 'canvas-confetti';

function VerifyCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifiedParam = searchParams.get('verified');

  const { mutate: checkStatus, isPending } = useCheckGoodDollarStatus();

  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<'verified' | 'not_verified' | 'expired' | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    // If the URL has verified=true, trigger a tiny celebratory confetti burst
    if (verifiedParam === 'true') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00C853', '#00E676', '#69F0AE', '#ffffff'],
      });
    }
  }, [verifiedParam]);

  const handleCheck = () => {
    setAddressError(null);
    setResultMessage(null);
    setCheckResult(null);

    const trimmed = addressInput.trim();
    if (!trimmed) {
      setAddressError('Please enter a wallet address.');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setAddressError('Please enter a valid wallet address (0x...)');
      return;
    }

    checkStatus(trimmed, {
      onSuccess: (data) => {
        if (data.verified) {
          setCheckResult('verified');
          setResultMessage(data.message || 'Verification successful!');
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#00C853', '#2E7D32', '#A5D6A7', '#ffffff'],
          });
          // Redirect to profile/coach after a short delay
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setCheckResult(data.reason as 'not_verified' | 'expired');
          setResultMessage(data.message || 'Could not verify.');
        }
      },
      onError: (err) => {
        setAddressError(err.message || 'Could not reach GoodDollar network.');
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass rounded-3xl p-6 sm:p-8 border border-white/10 text-center relative z-10"
      >
        {/* Verification Status Icon */}
        <div className="mb-6 relative flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-4xl shadow-inner shadow-green-500/10">
            {checkResult === 'verified' ? '🎉' : '🌍'}
          </div>
          {checkResult === 'verified' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-0 right-[calc(50%-40px)] bg-green-500 text-white rounded-full p-1 border-4 border-background"
            >
              <CheckCircle className="w-5 h-5" />
            </motion.div>
          )}
        </div>

        {checkResult === 'verified' ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Identity Verified!</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your GoodDollar Proof of Humanity verification was successfully linked to your SwipeGig account.
            </p>
            <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/15 text-green-400 text-xs font-semibold">
              Redirecting you to dashboard...
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all cursor-pointer"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Face Verification Done?</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                If you just completed face verification on GoodWallet, enter your GoodWallet address below to link your verification.
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label htmlFor="callback-address-input" className="block text-sm text-white font-medium mb-1.5">
                  Enter your GoodWallet address
                </label>
                <input
                  id="callback-address-input"
                  type="text"
                  placeholder="0x..."
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    if (addressError) setAddressError(null);
                  }}
                  className={`w-full glass rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
                    addressError || checkResult === 'not_verified'
                      ? 'border border-red-500/40 focus:ring-red-500/20'
                      : checkResult === 'expired'
                      ? 'border border-amber-500/40 focus:ring-amber-500/20'
                      : 'border border-white/10'
                  }`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Find this in GoodWallet under: Settings → My Address
                </p>
              </div>

              <button
                onClick={handleCheck}
                disabled={!addressInput.trim() || isPending}
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
                    Verify & Link Account
                  </>
                )}
              </button>

              {/* Feedback messages */}
              {addressError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addressError}</span>
                </div>
              )}

              {checkResult === 'not_verified' && resultMessage && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resultMessage}</span>
                </div>
              )}

              {checkResult === 'expired' && resultMessage && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resultMessage}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push('/')}
                className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                Skip for now, return to home
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyCallbackContent />
    </Suspense>
  );
}
