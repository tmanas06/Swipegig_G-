'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import {
  Coins,
  Trophy,
  TrendingUp,
  Star,
  Zap,
  Gift,
  Users,
  Briefcase,
  Award,
  Target,
  Flame,
} from 'lucide-react';
import { cn, formatGDollars, timeAgo } from '@/lib/utils';
import GoodDollarVerifyGate from '@/components/GoodDollarVerifyGate';

const getTriggerIcon = (trigger: string) => {
  switch (trigger) {
    case 'APPLICATION':
    case 'FIRST_APPLICATION':
      return Briefcase;
    case 'DAILY_LOGIN':
      return Flame;
    case 'COMPANY_REVIEW':
      return Star;
    case 'PROFILE_COMPLETION':
      return Target;
    case 'INTERVIEW_LANDED':
      return Trophy;
    case 'REFERRAL':
      return Users;
    default:
      return Award;
  }
};

export default function RewardsPage() {
  const { user, authenticated } = usePrivy();
  const privyUserId = user?.id;

  // 1. Fetch user rewards data
  const { data: rewardsData, isLoading: isRewardsLoading } = useQuery<any>({
    queryKey: ['rewards-data', privyUserId],
    queryFn: async () => {
      if (!privyUserId) throw new Error('Not authenticated');
      const res = await fetch('/api/rewards', {
        headers: { 'x-privy-user-id': privyUserId },
      });
      if (!res.ok) throw new Error('Failed to fetch rewards');
      return res.json();
    },
    enabled: !!privyUserId && authenticated,
  });

  // 2. Fetch leaderboard
  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery<any>({
    queryKey: ['rewards-leaderboard', privyUserId],
    queryFn: async () => {
      if (!privyUserId) throw new Error('Not authenticated');
      const res = await fetch('/api/rewards/leaderboard', {
        headers: { 'x-privy-user-id': privyUserId },
      });
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    enabled: !!privyUserId && authenticated,
  });

  if (isRewardsLoading || isLeaderboardLoading) {
    return (
      <GoodDollarVerifyGate feature="rewards">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-muted-foreground text-sm animate-pulse">Loading rewards...</p>
          </div>
        </div>
      </GoodDollarVerifyGate>
    );
  }

  const balance = rewardsData?.balance ?? 0;
  const totalEarned = rewardsData?.totalEarned ?? 0;
  const streak = rewardsData?.streak ?? 0;
  const rawHistory = rewardsData?.history ?? [];
  const leaderboard = leaderboardData?.leaderboard ?? [];

  // Find user's rank
  const userRankItem = leaderboard.find((item: any) => item.privyId === privyUserId);
  const rankText = userRankItem ? `#${userRankItem.rank}` : 'N/A';

  // Format history logs
  const rewardHistory = rawHistory.map((reward: any) => {
    let description = '';
    if (reward.metadata && typeof reward.metadata === 'object' && (reward.metadata as any).description) {
      description = (reward.metadata as any).description;
    } else {
      switch (reward.trigger) {
        case 'PROFILE_COMPLETION':
          description = 'Completed profile setup';
          break;
        case 'FIRST_APPLICATION':
          description = 'Submitted first job application';
          break;
        case 'APPLICATION':
          description = 'Applied to a job';
          break;
        case 'INTERVIEW_LANDED':
          description = 'Landed a job interview';
          break;
        case 'REFERRAL':
          description = 'Referred a new user';
          break;
        case 'COMPANY_REVIEW':
          description = 'Reviewed a company';
          break;
        case 'DAILY_LOGIN':
          description = 'Daily login bonus';
          break;
        default:
          description = 'Earned reward';
      }
    }

    return {
      id: reward.id,
      description,
      date: timeAgo(reward.createdAt),
      amount: reward.amount,
      icon: getTriggerIcon(reward.trigger),
    };
  });

  // Dynamically evaluate achievements based on history and streak
  const hasFirstApp = rawHistory.some((r: any) => r.trigger === 'APPLICATION' || r.trigger === 'FIRST_APPLICATION');
  const appCount = rawHistory.filter((r: any) => r.trigger === 'APPLICATION' || r.trigger === 'FIRST_APPLICATION').length;
  const reviewCount = rawHistory.filter((r: any) => r.trigger === 'COMPANY_REVIEW').length;
  const referralCount = rawHistory.filter((r: any) => r.trigger === 'REFERRAL').length;

  const achievements = [
    { name: 'First App', description: 'Applied to first job', earned: hasFirstApp, icon: Briefcase, color: 'text-green-400' },
    { name: 'Streak Master', description: '7-day login streak', earned: streak >= 7, icon: Flame, color: 'text-orange-400' },
    { name: 'Reviewer', description: 'Left a company review', earned: reviewCount >= 1, icon: Star, color: 'text-purple-400' },
    { name: 'Networker', description: 'Referred a user', earned: referralCount >= 1, icon: Users, color: 'text-cyan-400' },
    { name: 'Job Seeker', description: '5+ job applications', earned: appCount >= 5, icon: Target, color: 'text-pink-400' },
  ];

  return (
    <GoodDollarVerifyGate feature="rewards">
      <div className="min-h-screen bg-background page-enter">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold mb-6">
            G$ <span className="text-gradient-primary">Rewards</span>
          </h1>

          {/* Balance Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 gradient-border col-span-2 lg:col-span-1"
            >
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Balance</span>
              </div>
              <p className="text-3xl font-bold text-gradient-primary">{formatGDollars(balance)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm text-muted-foreground">Total Earned</span>
              </div>
              <p className="text-2xl font-bold">{formatGDollars(totalEarned)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-muted-foreground">Rank</span>
              </div>
              <p className="text-2xl font-bold">{rankText}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-muted-foreground">Login Streak</span>
              </div>
              <p className="text-2xl font-bold">{streak} days</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reward History */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Reward History
                </h2>
                {rewardHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No rewards earned yet. Start applying to jobs to claim rewards!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {rewardHistory.map((reward: any) => (
                      <div
                        key={reward.id}
                        className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0">
                          <reward.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{reward.description}</p>
                          <p className="text-xs text-muted-foreground">{reward.date}</p>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">
                          +{reward.amount} G$
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Achievements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Achievements
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {achievements.map((badge) => (
                    <div
                      key={badge.name}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all',
                        badge.earned
                          ? 'glass hover:bg-white/5'
                          : 'glass opacity-40'
                      )}
                    >
                      <badge.icon className={cn('w-8 h-8', badge.earned ? badge.color : 'text-muted-foreground')} />
                      <span className="text-sm font-semibold">{badge.name}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{badge.description}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Leaderboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6 h-fit"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Leaderboard
              </h2>
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No users on the leaderboard yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {leaderboard.map((userItem: any) => (
                    <div
                      key={userItem.rank}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                        userItem.rank <= 3 ? 'glass-primary border border-primary/10' : 'hover:bg-white/5',
                        userItem.privyId === privyUserId && 'border border-primary/50 shadow-lg shadow-primary/10 bg-primary/5'
                      )}
                    >
                      <span className={cn(
                        'text-sm font-bold w-6',
                        userItem.rank === 1 ? 'text-yellow-400' :
                        userItem.rank === 2 ? 'text-gray-400' :
                        userItem.rank === 3 ? 'text-orange-400' :
                        'text-muted-foreground'
                      )}>
                        #{userItem.rank}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center text-sm font-bold shrink-0">
                        {userItem.avatar}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate">
                        {userItem.name} {userItem.privyId === privyUserId && <span className="text-[10px] text-primary font-bold">(You)</span>}
                      </span>
                      <span className="text-xs text-primary font-semibold shrink-0">
                        {formatGDollars(userItem.score)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </GoodDollarVerifyGate>
  );
}
