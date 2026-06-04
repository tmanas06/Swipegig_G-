'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function VerifyCallbackPage() {
  useEffect(() => {
    // Notify the main window that verification succeeded via localStorage
    localStorage.setItem('gooddollar-verified-success', 'true');
    
    // Also notify via opener if available
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'gooddollar-verified' }, window.location.origin);
      } catch (e) {
        console.error(e);
      }
    }
    
    // Auto-close the tab after 4 seconds
    const timer = setTimeout(() => {
      window.close();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="max-w-md w-full glass rounded-3xl p-8 border border-green-500/20 shadow-2xl flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-6 shadow-inner shadow-green-500/10 animate-pulse">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold mb-3">Verification Complete!</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Your face verification on GoodDollar was successfully completed. We have updated your status on SwipeGig.
        </p>

        <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 justify-center mb-6">
          <Loader2 className="w-4 h-4 animate-spin text-green-400" />
          <span className="text-xs text-muted-foreground font-semibold">Closing this tab automatically...</span>
        </div>

        <div className="text-[11px] text-muted-foreground mb-4">
          If the tab does not close, you can click the button below.
        </div>

        <button
          onClick={() => window.close()}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all cursor-pointer"
        >
          Close Tab Now
        </button>
      </motion.div>
    </div>
  );
}
