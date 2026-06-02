'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Edit3,
  MapPin,
  GitFork,
  Link2,
  Globe,
  Shield,
  Award,
  Briefcase,
  Code,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Save,
  Wallet,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'react-hot-toast';
import { usePrivy } from '@privy-io/react-auth';

export default function ProfilePage() {
  const { user, isLoading, setUser } = useUserStore();
  const { user: privyUser } = usePrivy();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // Sync form states with user store on load / toggle
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setHeadline(user.profile?.headline || '');
      setBio(user.profile?.bio || '');
      setLocation(user.profile?.location || '');
      setGithubUrl(user.profile?.githubUrl || '');
      setLinkedinUrl(user.profile?.linkedinUrl || '');
      setPortfolioUrl(user.profile?.portfolioUrl || '');
      setSkills(user.profile?.skills || []);
    }
  }, [user, isEditing]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': user.privyId,
        },
        body: JSON.stringify({
          name,
          headline,
          bio,
          location,
          githubUrl: githubUrl || null,
          linkedinUrl: linkedinUrl || null,
          portfolioUrl: portfolioUrl || null,
          skills,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      
      // Update local store
      setUser({
        ...user,
        name,
        profileScore: data.profileScore,
        profile: {
          ...user.profile,
          bio,
          headline,
          location,
          githubUrl: githubUrl || null,
          linkedinUrl: linkedinUrl || null,
          portfolioUrl: portfolioUrl || null,
          skills,
          visibility: user.profile?.visibility || 'PUBLIC',
        },
      });

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSkill = newSkill.trim();
    if (cleanSkill && !skills.includes(cleanSkill)) {
      setSkills((prev) => [...prev, cleanSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const scoreBreakdown = [
    { label: 'Basic Info', completed: !!user.name, points: 15 },
    { label: 'Bio & Headline', completed: !!user.profile?.bio && !!user.profile?.headline, points: 15 },
    { label: 'Skills', completed: !!user.profile?.skills && user.profile.skills.length > 0, points: 15 },
    { label: 'Resume Upload', completed: !!user.resume, points: 20 },
    { label: 'GitHub Connected', completed: !!user.profile?.githubUrl, points: 10 },
    { label: 'LinkedIn Connected', completed: !!user.profile?.linkedinUrl, points: 10 },
    { label: 'Verified Human', completed: !!user.isVerified, points: 10 },
    { label: 'Portfolio', completed: !!user.profile?.portfolioUrl, points: 5 },
  ];

  // Try to parse experience from resume JSON if available
  let experienceList: Array<{
    company: string;
    title: string;
    period: string;
    description: string;
  }> = [];

  if (user.resume?.parsedExperience) {
    try {
      experienceList = typeof user.resume.parsedExperience === 'string'
        ? JSON.parse(user.resume.parsedExperience)
        : (user.resume.parsedExperience as any);
    } catch (e) {
      console.error('Error parsing experience JSON:', e);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'stroke-green-400';
    if (score >= 60) return 'stroke-yellow-400';
    return 'stroke-orange-400';
  };

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 gradient-border mb-6"
        >
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-black font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">GitHub Profile Link</label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">LinkedIn Profile Link</label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Portfolio Website Link</label>
                  <input
                    type="text"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://portfolio.dev"
                    className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                  {name ? name.charAt(0) : <UserIcon className="w-10 h-10 text-white" />}
                </div>
                {user.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background flex items-center justify-center shadow-lg">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold truncate">{name || 'Anon Seeker'}</h1>
                  {user.ensName && (
                    <span className="badge-web3 text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0">
                      {user.ensName}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mb-3 text-sm md:text-base leading-snug">
                  {headline || 'Web3 Builder'}
                </p>
                {privyUser?.wallet?.address && (
                  <div 
                    onClick={() => {
                      navigator.clipboard.writeText(privyUser.wallet?.address || '');
                      toast.success('Wallet address copied!');
                    }}
                    className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-primary/30 px-3 py-1.5 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground transition-all duration-200 group cursor-pointer mb-3"
                    title="Click to copy wallet address"
                  >
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span>{`${privyUser.wallet.address.slice(0, 6)}...${privyUser.wallet.address.slice(-4)}`}</span>
                    <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5 shrink-0" />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {location}
                    </div>
                  )}
                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <GitFork className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <Link2 className="w-4 h-4" />
                      LinkedIn
                    </a>
                  )}
                  {portfolioUrl && (
                    <a
                      href={portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      Portfolio
                    </a>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/10 transition-all text-sm font-medium cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            </div>
          )}

          {/* Bio */}
          {!isEditing && bio && (
            <p className="mt-6 text-muted-foreground text-sm leading-relaxed whitespace-pre-line border-t border-border/40 pt-4">
              {bio}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Skills
              </h2>

              {isEditing ? (
                <div>
                  <form onSubmit={handleAddSkill} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Add a skill (e.g. Solidity)..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      className="flex-1 glass rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center p-2.5 rounded-xl gradient-hero text-black hover:shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="p-0.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-default"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No skills added yet.</span>
                  )}
                </div>
              )}
            </motion.div>

            {/* Experience */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" />
                Experience
              </h2>
              <div className="space-y-6">
                {experienceList.length > 0 ? (
                  experienceList.map((exp, i) => (
                    <div key={i} className="relative pl-6 border-l-2 border-border/60">
                      <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <h3 className="font-semibold text-sm md:text-base">{exp.title}</h3>
                      <p className="text-sm text-primary font-medium">{exp.company}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{exp.period}</p>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{exp.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your resume in onboarding or settings to automatically parse your work history.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Profile Score */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                Profile Score
              </h2>

              {/* Circular Progress */}
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-white/5"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - (user.profileScore || 0) / 100)}`}
                      className={getScoreRingColor(user.profileScore || 0)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn('text-3xl font-bold', getScoreColor(user.profileScore || 0))}>
                      {user.profileScore || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5">
                {scoreBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-sm">
                    {item.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn(
                      'flex-1',
                      item.completed ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {item.label}
                    </span>
                    <span className={cn(
                      'text-xs font-medium',
                      item.completed ? 'text-green-400' : 'text-muted-foreground'
                    )}>
                      +{item.points}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Badges
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl text-center',
                  user.isVerified ? 'glass-primary text-primary' : 'glass opacity-30 text-muted-foreground'
                )}>
                  <Shield className="w-6 h-6" />
                  <span className="text-[10px] font-medium">Verified</span>
                </div>
                <div className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl text-center',
                  skills.includes('Solidity') || skills.includes('Rust') || skills.includes('Smart Contracts')
                    ? 'glass-accent text-purple-400'
                    : 'glass opacity-30 text-muted-foreground'
                )}>
                  <Code className="w-6 h-6" />
                  <span className="text-[10px] font-medium">Web3 Dev</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl glass text-center opacity-30">
                  <Award className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">Top Swiper</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
