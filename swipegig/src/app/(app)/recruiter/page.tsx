'use client';

import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  GitFork,
  Shield,
  Code,
  Briefcase,
  MessageSquare,
  Star,
  ExternalLink,
  ChevronRight,
  Building2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mockCandidates = [
  {
    id: '1',
    name: 'Alex Chen',
    headline: 'Senior Solidity Developer',
    skills: ['Solidity', 'DeFi', 'Hardhat', 'TypeScript'],
    isVerified: true,
    matchScore: 94,
    githubActivity: 'High',
    location: 'San Francisco, CA',
  },
  {
    id: '2',
    name: 'Sarah Kim',
    headline: 'Full-Stack Web3 Engineer',
    skills: ['React', 'Next.js', 'Solidity', 'GraphQL'],
    isVerified: true,
    matchScore: 89,
    githubActivity: 'High',
    location: 'New York, NY',
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    headline: 'Smart Contract Auditor',
    skills: ['Security', 'Solidity', 'Yul', 'Formal Verification'],
    isVerified: false,
    matchScore: 82,
    githubActivity: 'Medium',
    location: 'London, UK',
  },
  {
    id: '4',
    name: 'Priya Patel',
    headline: 'DeFi Protocol Engineer',
    skills: ['Solidity', 'Rust', 'DeFi', 'MEV'],
    isVerified: true,
    matchScore: 91,
    githubActivity: 'Very High',
    location: 'Remote',
  },
];

export default function RecruiterPage() {
  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Recruiter <span className="text-gradient-accent">Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse verified Web3 talent
            </p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-hero text-black font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all">
            <Plus className="w-4 h-4" />
            Post Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Candidates', value: '5,234', icon: Users, color: 'text-blue-400' },
            { label: 'Verified Humans', value: '3,891', icon: Shield, color: 'text-green-400' },
            { label: 'Active Jobs', value: '12', icon: Briefcase, color: 'text-purple-400' },
            { label: 'Shortlisted', value: '28', icon: Star, color: 'text-yellow-400' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={cn('w-4 h-4', stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by skills, role, or location..."
              className="w-full glass rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 bg-transparent"
            />
          </div>
          <button className="p-3 rounded-xl glass hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Candidate Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockCandidates.map((candidate, i) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-6 hover:bg-white/5 transition-all cursor-pointer group gradient-border"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center text-xl font-bold shrink-0">
                  {candidate.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{candidate.name}</h3>
                    {candidate.isVerified && (
                      <Shield className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{candidate.headline}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{candidate.location}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 shrink-0">
                  <span className="text-green-400 font-bold text-sm">{candidate.matchScore}%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5" />
                    <span>{candidate.githubActivity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-lg glass hover:bg-white/10 text-xs font-medium transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-xs font-medium text-primary transition-colors">
                    Shortlist
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
