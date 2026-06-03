'use client';

import { motion } from 'framer-motion';
import {
  Coins,
  Trophy,
  TrendingUp,
  Star,
  Zap,
  Gift,
  Calendar,
  Users,
  Briefcase,
  Award,
  Target,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { cn, formatGDollars } from '@/lib/utils';
import GoodDollarVerifyGate from '@/components/GoodDollarVerifyGate';

const mockRewards = {
  balance: 425,
  totalEarned: 1250,
  rank: 12,
  streak: 7,
};

const rewardHistory = [
  { id: '1', trigger: 'APPLICATION', amount: 5, description: 'Applied to Aave Protocol', date: '2h ago', icon: Briefcase },
  { id: '2', trigger: 'DAILY_LOGIN', amount: 2, description: 'Daily login streak (Day 7)', date: '5h ago', icon: Flame },
  { id: '3', trigger: 'APPLICATION', amount: 5, description: 'Applied to Uniswap Labs', date: '1d ago', icon: Briefcase },
  { id: '4', trigger: 'COMPANY_REVIEW', amount: 15, description: 'Reviewed Compound Finance', date: '2d ago', icon: Star },
  { id: '5', trigger: 'PROFILE_COMPLETION', amount: 50, description: 'Profile completed to 80%', date: '3d ago', icon: Target },
  { id: '6', trigger: 'INTERVIEW_LANDED', amount: 100, description: 'Interview at OpenZeppelin', date: '5d ago', icon: Trophy },
  { id: '7', trigger: 'REFERRAL', amount: 30, description: 'Referred alex.eth', date: '1w ago', icon: Users },
];

const leaderboard = [
  { rank: 1, name: 'vitalik.eth', score: 3250, avatar: 'V' },
  { rank: 2, name: 'satoshi.eth', score: 2890, avatar: 'S' },
  { rank: 3, name: 'gavin.eth', score: 2450, avatar: 'G' },
  { rank: 4, name: 'hayden.eth', score: 2100, avatar: 'H' },
  { rank: 5, name: 'stani.eth', score: 1950, avatar: 'S' },
];

const achievements = [
  { name: 'First App', description: 'Applied to first job', earned: true, icon: Briefcase, color: 'text-green-400' },
  { name: 'Speed Runner', description: '10 applications in a day', earned: true, icon: Zap, color: 'text-yellow-400' },
  { name: 'Streak Master', description: '7-day login streak', earned: true, icon: Flame, color: 'text-orange-400' },
  { name: 'Reviewer', description: 'Left 5 company reviews', earned: false, icon: Star, color: 'text-purple-400' },
  { name: 'Networker', description: 'Referred 10 users', earned: false, icon: Users, color: 'text-cyan-400' },
  { name: 'Job Hunter', description: '100 total applications', earned: false, icon: Target, color: 'text-pink-400' },
];

export default function RewardsPage() {
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
            <p className="text-3xl font-bold text-gradient-primary">{formatGDollars(mockRewards.balance)}</p>
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
            <p className="text-2xl font-bold">{formatGDollars(mockRewards.totalEarned)}</p>
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
            <p className="text-2xl font-bold">#{mockRewards.rank}</p>
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
            <p className="text-2xl font-bold">{mockRewards.streak} days</p>
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
              <div className="space-y-3">
                {rewardHistory.map((reward) => (
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
            <div className="space-y-3">
              {leaderboard.map((user) => (
                <div
                  key={user.rank}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                    user.rank <= 3 ? 'glass-primary' : 'hover:bg-white/5'
                  )}
                >
                  <span className={cn(
                    'text-sm font-bold w-6',
                    user.rank === 1 ? 'text-yellow-400' :
                    user.rank === 2 ? 'text-gray-400' :
                    user.rank === 3 ? 'text-orange-400' :
                    'text-muted-foreground'
                  )}>
                    #{user.rank}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center text-sm font-bold">
                    {user.avatar}
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-primary font-semibold">{formatGDollars(user.score)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </GoodDollarVerifyGate>
);
}
