'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  User,
  Briefcase,
  MessageSquare,
  LayoutGrid,
  Gift,
  Settings,
  Menu,
  X,
  LogOut,
  Wallet,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';
import VerificationStatusBadge from '@/components/VerificationStatusBadge';
import confetti from 'canvas-confetti';

const navItems = [
  { href: '/feed', label: 'Swipe', icon: Zap, color: 'text-green-400' },
  { href: '/profile', label: 'Profile', icon: User, color: 'text-blue-400' },
  { href: '/applications', label: 'Applications', icon: Briefcase, color: 'text-orange-400' },
  { href: '/coach', label: 'AI Coach', icon: MessageSquare, color: 'text-purple-400' },
  { href: '/rewards', label: 'Rewards', icon: Gift, color: 'text-yellow-400' },
  { href: '/wallet', label: 'Wallet', icon: Wallet, color: 'text-emerald-400' },
  { href: '/recruiter', label: 'Recruiter', icon: LayoutGrid, color: 'text-cyan-400' },
  { href: '/settings', label: 'Settings', icon: Settings, color: 'text-gray-400' },
];

function CelebrationModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 85,
      origin: { y: 0.6 }
    });
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="glass rounded-3xl p-10 max-w-md w-full mx-6 text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti-like decorations */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24', '#a78bfa'][i % 7],
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0.5],
                opacity: [0, 1, 0],
                y: [0, -20, 20],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          ))}
        </div>

        {/* Green checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2, damping: 15 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30"
        >
          <ShieldCheck className="w-10 h-10 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-2">
            🎉 You&apos;re GoodDollar Verified!
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            You now have access to:
          </p>

          <div className="space-y-2 text-left mb-8">
            {[
              'G$ wallet and rewards',
              'Job Seekers Pool (daily G$ stream)',
              'Creator marketplace',
              'Unlimited AI coaching',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-green-400" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <Link
            href="/rewards"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all"
          >
            Start Earning G$
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, user, logout, login } = usePrivy();
  const { user: storeUser } = useUserStore();
  const { isVerified, verifiedAt, expiresAt, isExpiringSoon } = useGoodDollarVerification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const isAdmin = storeUser?.role === 'ADMIN';

  // Check for ?verified=true query param
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowCelebration(true);
      // Remove the query param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('verified');
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  // Build nav items dynamically — include Admin only for admin users
  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck, color: 'text-red-400' }] : []),
  ];

  // Don't show navbar on landing page
  if (pathname === '/') return null;

  return (
    <>
      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <CelebrationModal onClose={() => setShowCelebration(false)} />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-[72px] hover:w-[240px] flex-col glass border-r border-border z-50 transition-all duration-300 group overflow-hidden">
        {/* Logo */}
        <Link
          href="/feed"
          className="flex items-center gap-3 px-5 py-6 border-b border-border"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
            <img 
              src="/logo.svg" 
              alt="SwipeGig Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-lg font-bold text-gradient-hero opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            SwipeGig
          </span>
        </Link>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-1 px-3 py-4">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && item.color)} />
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Verification Badge + User Section */}
        <div className="border-t border-border px-3 py-4 space-y-3">
          {authenticated && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <VerificationStatusBadge
                isVerified={isVerified}
                verifiedAt={verifiedAt}
                expiresAt={expiresAt}
                isExpiringSoon={isExpiringSoon}
                onVerifyClick={() => router.push('/settings')}
              />
            </div>
          )}
          {authenticated ? (
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Sign Out
              </span>
            </button>
          ) : (
            <button
              onClick={() => login()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 w-full"
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Connect
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {allNavItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-indicator"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className={cn('w-5 h-5', isActive && item.color)} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 glass rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Menu</h3>
                <div className="flex items-center gap-3">
                  {authenticated && (
                    <VerificationStatusBadge
                      isVerified={isVerified}
                      verifiedAt={verifiedAt}
                      expiresAt={expiresAt}
                      isExpiringSoon={isExpiringSoon}
                      onVerifyClick={() => {
                        setMobileMenuOpen(false);
                        router.push('/settings');
                      }}
                    />
                  )}
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {allNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-white/5'
                      )}
                    >
                      <item.icon className={cn('w-5 h-5', isActive && item.color)} />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  );
                })}

                {authenticated && (
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full mt-4 border-t border-border pt-4"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="flex-1 text-left text-sm font-medium">Sign Out</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
