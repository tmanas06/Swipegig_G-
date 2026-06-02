'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { usePrivy, useLinkAccount } from '@privy-io/react-auth';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const { logout, user: privyUser } = usePrivy();
  const { user: storeUser, updateProfile } = useUserStore();
  const { theme, toggleTheme } = useAppStore();

  const [visibility, setVisibility] = useState<'PUBLIC' | 'RECRUITERS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    jobAlerts: true,
    marketing: false,
  });

  const { linkEmail, linkWallet } = useLinkAccount({
    onSuccess: (user) => {
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

  const handleDeleteAccount = async () => {
    if (!privyUser?.id) return;
    
    const confirmed = confirm('WARNING: Are you sure you want to permanently delete your account? This will wipe your profile, resume, applications, saved jobs, and rewards. This action is completely irreversible.');
    if (!confirmed) return;

    const secondConfirm = confirm('Type "DELETE" to confirm your deletion request:');
    if (secondConfirm !== true && String(secondConfirm).toUpperCase() !== 'DELETE') {
      toast.error('Deletion cancelled. Confirmation text did not match.');
      return;
    }

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
        // Sign out from Privy
        await logout();
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete your account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">
          <span className="text-gradient-primary">Settings</span>
        </h1>

        <div className="space-y-6">
          {/* Account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                  onChange={(e) => handleUpdateVisibility(e.target.value as any)}
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
            transition={{ delay: 0.05 }}
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
            transition={{ delay: 0.1 }}
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
            transition={{ delay: 0.15 }}
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
                onClick={handleDeleteAccount}
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
            transition={{ delay: 0.2 }}
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
    </div>
  );
}
