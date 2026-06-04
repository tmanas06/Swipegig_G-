'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUserStore } from '@/stores/useUserStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  Briefcase,
  FileText,
  Gift,
  Activity,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Crown,
  Shield,
  Lock,
  RefreshCw,
  Blocks,
  Coins,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Stats {
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  totalRewardsDistributed: number;
  activeUsersLast7d: number;
  usersByRole: Record<string, number>;
  applicationsByStatus: Record<string, number>;
}

interface ContractInfo {
  rewards: string | null;
  applications: string | null;
  pool: string | null;
  mockGD: string | null;
  deployer: string | null;
  network: string;
  allDeployed: boolean;
}

interface AdminUser {
  id: string;
  privyId: string;
  email: string | null;
  name: string | null;
  walletAddress: string | null;
  role: 'SEEKER' | 'RECRUITER' | 'ADMIN';
  isVerified: boolean;
  isGoodDollarVerified: boolean;
  goodDollarAddress: string | null;
  profileScore: number;
  loginStreak: number;
  lastLoginAt: string | null;
  createdAt: string;
  _count: {
    applications: number;
    rewards: number;
    savedJobs: number;
  };
}

const roleColors: Record<string, string> = {
  SEEKER: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  RECRUITER: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  ADMIN: 'bg-red-500/10 border-red-500/20 text-red-400',
};

const roleIcons: Record<string, any> = {
  SEEKER: Users,
  RECRUITER: Briefcase,
  ADMIN: Crown,
};

export default function AdminPage() {
  const { user: privyUser } = usePrivy();
  const { user: storeUser } = useUserStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [contracts, setContracts] = useState<ContractInfo | null>(null);

  // Users tab
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'contracts'>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!privyUser?.id) return;
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-privy-user-id': privyUser.id },
      });
      if (res.status === 403) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data.stats);
      setContracts(data.contracts);
      setIsAuthorized(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    if (!privyUser?.id) return;
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { 'x-privy-user-id': privyUser.id },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: { role?: string; isVerified?: boolean }) => {
    if (!privyUser?.id) return;
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': privyUser.id,
        },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (!res.ok) throw new Error('Update failed');
      const data = await res.json();
      toast.success(`User ${data.user.email || data.user.id} updated`);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err) {
      toast.error('Failed to update user');
    } finally {
      setUpdatingUserId(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [privyUser?.id]);

  useEffect(() => {
    if (activeTab === 'users' && isAuthorized) {
      fetchUsers();
    }
  }, [activeTab, isAuthorized, searchQuery, roleFilter]);

  // Not authorized
  if (!isLoading && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 border border-red-500/20">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm mb-2">
          You don&apos;t have admin privileges to access this page.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Contact the platform administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  const isDeployed = (addr: string | null | undefined) =>
    !!addr && addr !== '0x0000000000000000000000000000000000000000';

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Total Jobs', value: stats?.totalJobs ?? 0, icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Applications', value: stats?.totalApplications ?? 0, icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Rewards Given', value: stats?.totalRewardsDistributed?.toFixed(0) ?? '0', icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Active (7d)', value: stats?.activeUsersLast7d ?? 0, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 page-enter pb-24">
      {/* Header */}
      <div className="glass rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Logged in as <span className="text-red-400 font-semibold">{storeUser?.email || 'Admin'}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                Admin
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8">
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'users', label: 'Users', icon: Users },
          { key: 'contracts', label: 'Contracts', icon: Blocks },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2.5 px-6 py-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'border-red-400 text-red-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ━━━ OVERVIEW TAB ━━━ */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {statCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl p-5 relative overflow-hidden group"
                >
                  <div className={`w-10 h-10 rounded-xl ${card.bg} border flex items-center justify-center mb-3`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-extrabold">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">{card.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Breakdown Rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Users by Role */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Users by Role
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats?.usersByRole || {}).map(([role, count]) => {
                    const Icon = roleIcons[role] || Users;
                    return (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{role}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${roleColors[role] || 'bg-gray-500/10 text-gray-400'}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Applications by Status */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  Applications by Status
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats?.applicationsByStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm">{status}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-white/5 border-white/10 font-bold">
                        {count}
                      </span>
                    </div>
                  ))}
                  {Object.keys(stats?.applicationsByStatus || {}).length === 0 && (
                    <p className="text-xs text-muted-foreground">No applications yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contract Status */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Blocks className="w-4 h-4 text-emerald-400" />
                Smart Contract Status
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                  contracts?.allDeployed
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                }`}>
                  {contracts?.allDeployed ? 'All Deployed' : 'Partially Deployed'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Network: <span className="text-foreground font-medium">{contracts?.network}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* ━━━ USERS TAB ━━━ */}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, or wallet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent border border-border cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="SEEKER">Seekers</option>
                <option value="RECRUITER">Recruiters</option>
                <option value="ADMIN">Admins</option>
              </select>
              <button
                onClick={() => fetchUsers(pagination.page)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border hover:bg-white/5 transition-all text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Users Table */}
            <div className="glass rounded-2xl overflow-hidden">
              {usersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">User</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Role</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Verified</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Activity</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Joined</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-medium text-foreground">{u.name || 'Unnamed'}</p>
                              <p className="text-[11px] text-muted-foreground">{u.email || 'No email'}</p>
                              {u.walletAddress && (
                                <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5" title="Privy Embedded Wallet">
                                  Privy: {u.walletAddress.slice(0, 8)}...{u.walletAddress.slice(-6)}
                                </p>
                              )}
                              {u.goodDollarAddress && (
                                <p className="text-[10px] text-green-400 font-mono mt-0.5" title="GoodWallet Address">
                                  G$: {u.goodDollarAddress.slice(0, 8)}...{u.goodDollarAddress.slice(-6)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                              disabled={updatingUserId === u.id}
                              className={`text-[11px] px-2 py-1 rounded-lg border font-bold bg-transparent cursor-pointer ${roleColors[u.role]}`}
                            >
                              <option value="SEEKER">SEEKER</option>
                              <option value="RECRUITER">RECRUITER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => handleUpdateUser(u.id, { isVerified: !u.isVerified })}
                                disabled={updatingUserId === u.id}
                                className="cursor-pointer flex items-center gap-1.5 hover:opacity-80"
                              >
                                {u.isVerified ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-muted-foreground/40" />
                                )}
                                <span className="text-xs">{u.isVerified ? 'Verified' : 'Unverified'}</span>
                              </button>
                              {u.isVerified && (
                                u.goodDollarAddress ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-semibold w-fit">
                                    On-Chain Verified
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold w-fit">
                                    Admin Override
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span title="Applications">{u._count.applications} apps</span>
                              <span title="Rewards">{u._count.rewards} rewards</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {updatingUserId === u.id && (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            )}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => fetchUsers(pagination.page - 1)}
                      className="p-2 rounded-lg border border-border hover:bg-white/5 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchUsers(pagination.page + 1)}
                      className="p-2 rounded-lg border border-border hover:bg-white/5 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ━━━ CONTRACTS TAB ━━━ */}
        {activeTab === 'contracts' && (
          <motion.div
            key="contracts"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Network Info */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Blocks className="w-4 h-4 text-emerald-400" />
                Network Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Network</p>
                  <p className="font-medium mt-1">{contracts?.network}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Deployer</p>
                  <p className="font-mono text-xs mt-1 text-muted-foreground">{contracts?.deployer || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Contract Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: 'SwipeGigRewards', address: contracts?.rewards, icon: Gift, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
                { name: 'SwipeGigApplications', address: contracts?.applications, icon: FileText, color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
                { name: 'SwipeGigPool', address: contracts?.pool, icon: Coins, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
                { name: 'MockGoodDollar (mG$)', address: contracts?.mockGD, icon: Coins, color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
              ].map((c) => (
                <div key={c.name} className="glass rounded-2xl p-6 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${c.bgColor} border flex items-center justify-center`}>
                        <c.icon className={`w-5 h-5 ${c.color}`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{c.name}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${
                          isDeployed(c.address)
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {isDeployed(c.address) ? 'Deployed' : 'Not Deployed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isDeployed(c.address) ? (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">
                        Contract Address
                      </p>
                      <p className="font-mono text-xs text-muted-foreground break-all">{c.address}</p>
                      <a
                        href={`https://celo.blockscout.com/address/${c.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-primary hover:underline font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Blockscout
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Contract has not been deployed yet.</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
