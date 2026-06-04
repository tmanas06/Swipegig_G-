'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Moon,
  Sun,
  Globe,
  Download,
  Trash2,
  Wallet,
  Shield,
  Eye,
  LogOut,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { usePrivy, useLinkAccount } from '@privy-io/react-auth';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'react-hot-toast';
import { useGoodDollarVerification } from '@/hooks/useGoodDollarVerification';
import { useCheckGoodDollarStatus } from '@/hooks/useCheckGoodDollarStatus';
import { GOODDOLLAR_WALLET_URL } from '@/lib/gooddollar/constants';

export default function SettingsPage() {
  const { logout, user: privyUser } = usePrivy();
  const { user: storeUser, updateProfile } = useUserStore();
  const { theme, toggleTheme } = useAppStore();
  const {
    isVerified: gdVerified,
    verifiedAt: gdVerifiedAt,
    goodDollarAddress,
    expiresAt,
    isExpiringSoon,
    aiPromptsUsed,
    aiPromptsLimit,
    aiPromptsRemaining,
    isLoading: gdLoading,
  } = useGoodDollarVerification();
  const {
    mutate: checkStatus,
    isPending: isChecking,
    data: checkData,
    error: checkError,
  } = useCheckGoodDollarStatus();

  const [verifyStep, setVerifyStep] = useState<'idle' | 'verifying'>('idle');
  const [showReVerify, setShowReVerify] = useState(false);

  const checkResult = checkData ? (checkData.verified ? 'verified' : (checkData.reason as 'not_verified' | 'expired')) : null;
  const checkMessage = checkData?.message || null;

  const [visibility, setVisibility] = useState<'PUBLIC' | 'RECRUITERS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  
  // Custom Delete Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    jobAlerts: true,
    marketing: false,
  });

  const { linkEmail, linkWallet } = useLinkAccount({
    onSuccess: () => {
      toast.success('Account linked successfully!');
    },
    onError: (error) => {
      console.error('[LINK_ACCOUNT_ERROR]', error);
      toast.error('Failed to link account');
    }
  });

  // Sync theme to document element on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync initial state from store / local storage
  useEffect(() => {
    // 1. Profile Visibility
    if (storeUser?.profile?.visibility) {
      setVisibility(storeUser.profile.visibility);
    }

    // 2. Notifications
    const savedNotifications = localStorage.getItem('swipegig-notifications');
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (e) {}
    }
  }, [storeUser]);

  const handleUpdateVisibility = async (newVisibility: 'PUBLIC' | 'RECRUITERS_ONLY' | 'PRIVATE') => {
    if (!privyUser?.id) {
      toast.error('You must connect your account first.');
      return;
    }

    setIsUpdatingVisibility(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': privyUser.id,
        },
        body: JSON.stringify({ visibility: newVisibility }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile visibility');
      }

      // Update local Zustand store
      updateProfile({ visibility: newVisibility });
      setVisibility(newVisibility);
      toast.success(`Visibility set to ${newVisibility.toLowerCase().replace('_', ' ')}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update visibility setting');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleToggleNotification = (key: string) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key as keyof typeof prev] };
      localStorage.setItem('swipegig-notifications', JSON.stringify(next));
      return next;
    });
    toast.success('Notification preference updated!');
  };

  const handleExportData = () => {
    if (!storeUser) {
      toast.error('No user session found to export.');
      return;
    }

    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
        account: {
          id: storeUser.id,
          privyId: storeUser.privyId,
          name: storeUser.name,
          walletAddress: storeUser.walletAddress,
          ensName: storeUser.ensName,
          email: storeUser.email,
          avatarUrl: storeUser.avatarUrl,
          profileScore: storeUser.profileScore,
          isVerified: storeUser.isVerified,
          role: storeUser.role,
        },
        profile: storeUser.profile,
        resume: storeUser.resume,
      }, null, 2));

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `swipegig-export-${storeUser.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Your profile data has been exported.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export data');
    }
  };

  const openDeleteModal = () => {
    setDeleteInput('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!privyUser?.id) return;
    if (deleteInput !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      toast.loading('Deleting account...', { id: 'delete-loading' });
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: {
          'x-privy-user-id': privyUser.id,
        },
      });

      toast.dismiss('delete-loading');

      if (response.ok) {
        toast.success('Your account has been successfully deleted.');
        setIsDeleteModalOpen(false);
        // Sign out from Privy
        await logout();
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete your account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCheckVerification = () => {
    checkStatus(undefined, {
      onSuccess: (data) => {
        if (data.verified) {
          toast.success('Successfully verified with GoodDollar!');
          setVerifyStep('idle');
          setShowReVerify(false);
        } else {
          toast.error(data.message || 'Verification check failed.');
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">
          <span className="text-gradient-primary">Settings</span>
        </h1>

        <div className="space-y-6">
          {/* Identity Verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl overflow-hidden"
            id="verification"
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                Identity Verification
              </h2>
            </div>
            <div className="p-6">
              {gdLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Checking verification status...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {gdVerified ? (
                    /* Verified State */
                    <div className="space-y-4">
                      {isExpiringSoon ? (
                        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Re-verify Soon</p>
                            <p className="text-xs text-amber-400/80 mt-0.5">
                              Your verification expires on {expiresAt?.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-green-500/10 border border-green-500/20">
                          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-green-400">GoodDollar Verified Human ✓</p>
                            {gdVerifiedAt && (
                              <p className="text-xs text-green-400/60 mt-0.5">
                                Verified on {gdVerifiedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="glass rounded-xl px-4 py-3">
                          <p className="text-xs text-muted-foreground mb-1">Wallet</p>
                          <p className="font-mono text-xs truncate">
                            {storeUser?.walletAddress ? `${storeUser.walletAddress.slice(0, 8)}...${storeUser.walletAddress.slice(-6)}` : '—'}
                          </p>
                        </div>
                        <div className="glass rounded-xl px-4 py-3">
                          <p className="text-xs text-muted-foreground mb-1">AI Coaching</p>
                          <p className="text-xs font-semibold text-green-400">Unlimited ∞</p>
                        </div>
                      </div>

                      {!showReVerify && (
                        <button
                          onClick={() => {
                            setVerifyStep('idle');
                            setShowReVerify(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
                        >
                          {isExpiringSoon ? 'Re-verify with GoodWallet' : 'Re-verify Identity'}
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Unverified / Expired State */
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">🌍</span>
                        </div>
                        <h3 className="font-bold text-base mb-2">
                          {expiresAt ? 'GoodDollar Verification Expired' : 'Verify with GoodDollar'}
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-4">
                          {expiresAt 
                            ? 'Your face verification has expired. Please complete re-verification in GoodWallet and submit your address below.'
                            : 'Complete a quick face verification to prove you\'re a unique human. Unlock G$ rewards, wallet access, unlimited AI coaching, and more.'
                          }
                        </p>

                        <div className="space-y-3 text-left mb-6 max-w-xs mx-auto">
                          {[
                            'G$ wallet and token rewards',
                            'Unlimited AI career coaching',
                            'Job Seekers Pool access',
                            'Creator marketplace',
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 1 & Step 2 verification input (visible when unverified, expired, or updating address) */}
                  {(!gdVerified || showReVerify) && (
                    <div className="border-t border-border pt-6 space-y-5">
                      {gdVerified && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Update/Re-verify Identity</p>
                          <button
                            onClick={() => setShowReVerify(false)}
                            className="text-xs text-muted-foreground hover:text-white underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Step 1 */}
                      <div className="text-left w-full">
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">── Step 1 ──</p>
                        <p className="text-sm text-white mb-3">Complete face verification in GoodWallet</p>
                        <button
                          onClick={() => {
                            window.open('https://codesandbox.io/embed/h3n3kp?view=preview&hidenavigation=1&hideexplorer=1', '_blank');
                            setVerifyStep('verifying');
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5 text-green-400 font-semibold text-sm transition-all cursor-pointer"
                        >
                          Open GoodWallet →
                        </button>
                      </div>

                      {/* Step 2 — just a button, no address input needed */}
                      {verifyStep === 'verifying' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-left w-full space-y-3 pt-2"
                        >
                          <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">── Step 2 ──</p>
                          <p className="text-sm text-white mb-2">
                            After completing face verification, click below to link it.
                          </p>

                          <button
                            onClick={handleCheckVerification}
                            disabled={isChecking}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-500/20 disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            {isChecking ? (
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

                          {/* Error/Result Feedbacks */}
                          {checkResult === 'not_verified' && checkMessage && (
                            <p className="text-xs text-red-500 mt-1.5 leading-relaxed">{checkMessage}</p>
                          )}

                          {checkResult === 'expired' && checkMessage && (
                            <p className="text-xs text-amber-500 mt-1.5 leading-relaxed">{checkMessage}</p>
                          )}

                          {checkError && (
                            <p className="text-xs text-red-500 mt-1.5 leading-relaxed">{checkError.message}</p>
                          )}
                        </motion.div>
                      )}

                      {storeUser?.walletAddress && (
                        <div className="w-full mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left space-y-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Your SwipeGig Wallet address</p>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <code className="text-xs font-mono text-green-400 break-all">{storeUser.walletAddress}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(storeUser.walletAddress!);
                                  toast.success('Address copied!');
                                }}
                                className="text-xs text-green-400 hover:text-green-300 font-semibold underline cursor-pointer shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-white/5">
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
                    </div>
                  )}

                  {/* AI prompt status */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t border-white/5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      AI Coach: {aiPromptsRemaining !== null ? `${aiPromptsRemaining} of ${aiPromptsLimit} free prompts left` : 'Unlimited'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Account
              </h2>
            </div>
            <div className="divide-y divide-border">
              <button
                onClick={() => {
                  if (privyUser?.email?.address) {
                    toast.success('Email is already connected!');
                  } else {
                    linkEmail();
                  }
                }}
                className="flex items-center justify-between px-6 py-4 w-full hover:bg-white/5 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">{privyUser?.email?.address || 'Click to link email'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => linkWallet()}
                className="flex items-center justify-between px-6 py-4 w-full hover:bg-white/5 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">Wallet</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {privyUser?.wallet?.address ? `${privyUser.wallet.address.slice(0, 8)}...${privyUser.wallet.address.slice(-6)}` : 'Click to link wallet'}
                  </p>
                </div>
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">Profile Visibility</p>
                  <p className="text-xs text-muted-foreground">Control who can view your builder profile</p>
                </div>
                <select
                  value={visibility}
                  onChange={(e) => handleUpdateVisibility(e.target.value as 'PUBLIC' | 'RECRUITERS_ONLY' | 'PRIVATE')}
                  disabled={isUpdatingVisibility}
                  className="bg-background border border-border text-foreground text-xs rounded-xl focus:ring-primary focus:border-primary block p-2 outline-none cursor-pointer"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="RECRUITERS_ONLY">Recruiters Only</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                Appearance
              </h2>
            </div>
            <div className="divide-y divide-border">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-between px-6 py-4 w-full hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-left">Theme</p>
                  <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
                </div>
                {theme === 'dark' ? (
                  <ToggleRight className="w-8 h-8 text-primary" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">Language</p>
                  <p className="text-xs text-muted-foreground">English</p>
                </div>
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-400" />
                Notifications
              </h2>
            </div>
            <div className="divide-y divide-border">
              {Object.entries(notifications).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleToggleNotification(key)}
                  className="flex items-center justify-between px-6 py-4 w-full hover:bg-white/5 transition-colors"
                >
                  <p className="text-sm font-medium capitalize text-left">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </p>
                  {value ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Data & Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400" />
                Data & Privacy
              </h2>
            </div>
            <div className="divide-y divide-border">
              <button
                onClick={handleExportData}
                className="flex items-center justify-between px-6 py-4 w-full hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-left">Export Data</p>
                  <p className="text-xs text-muted-foreground">Download all your profile and resume data as JSON</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={openDeleteModal}
                className="flex items-center justify-between px-6 py-4 w-full hover:bg-red-500/5 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-left text-red-400">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and profile data</p>
                </div>
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </motion.div>

          {/* Sign Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl glass hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-red-400 font-medium"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </motion.div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md glass rounded-3xl p-8 border border-red-500/20 shadow-2xl bg-background/95 backdrop-blur-md z-10"
            >
              <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                WARNING: This will permanently wipe your profile, resume, applications, saved jobs, and rewards. This action is completely irreversible.
              </p>

              <div className="space-y-4 mb-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Type <span className="text-red-500 font-mono font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  disabled={isDeleting}
                  className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 bg-transparent placeholder:text-muted-foreground/30 font-mono text-center tracking-widest text-red-500 font-bold"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl glass hover:bg-white/10 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteInput !== 'DELETE' || isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
