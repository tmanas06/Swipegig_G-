'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';

export default function VerifyLoadingPage() {
  const [status, setStatus] = useState<'waiting' | 'redirecting'>('waiting');

  useEffect(() => {
    // Clear any leftover URL first to prevent immediate redirect with stale links
    const interval = setInterval(() => {
      const url = localStorage.getItem('gooddollar-fv-url');
      if (url) {
        clearInterval(interval);
        setStatus('redirecting');
        localStorage.removeItem('gooddollar-fv-url');
        window.location.href = url;
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b0f] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="max-w-md w-full glass rounded-3xl p-8 border border-white/5 shadow-2xl flex flex-col items-center bg-white/[0.02] backdrop-blur-xl"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-6 animate-pulse">
          <Shield className="w-8 h-8" />
        </div>

        {status === 'waiting' ? (
          <>
            <h1 className="text-xl font-bold text-white mb-3">Action Required</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Please switch back to your SwipeGig tab and **approve the signature request** in your wallet to start verification.
            </p>
            <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-green-400" />
              <span className="text-xs text-muted-foreground font-semibold">Waiting for signature...</span>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white mb-3">Redirecting to GoodDollar</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Signature verified successfully. Preparing your secure verification session...
            </p>
            <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-green-400" />
              <span className="text-xs text-muted-foreground font-semibold">Loading verification page...</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
