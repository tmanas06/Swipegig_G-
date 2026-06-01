'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  Globe,
  Download,
  Trash2,
  Wallet,
  Shield,
  Eye,
  Mail,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { logout, user } = usePrivy();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    jobAlerts: true,
    marketing: false,
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
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
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">{user?.email?.address || 'Not connected'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">Wallet</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {user?.wallet?.address ? `${user.wallet.address.slice(0, 8)}...${user.wallet.address.slice(-6)}` : 'Not connected'}
                  </p>
                </div>
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">Profile Visibility</p>
                  <p className="text-xs text-muted-foreground">Public</p>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground" />
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
                  onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className="flex items-center justify-between px-6 py-4 w-full hover:bg-white/5 transition-colors"
                >
                  <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
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
              <button className="flex items-center justify-between px-6 py-4 w-full hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-medium text-left">Export Data</p>
                  <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="flex items-center justify-between px-6 py-4 w-full hover:bg-red-500/5 transition-colors group">
                <div>
                  <p className="text-sm font-medium text-left text-red-400">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
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
