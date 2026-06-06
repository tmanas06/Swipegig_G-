'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Loader2,
  MapPin,
  FileText,
  X,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// Custom SVG components since brands are missing from this lucide-react package version
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface Candidate {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  skills: string[];
  isVerified: boolean;
  matchScore: number;
  githubActivity: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  location: string;
  bio: string;
}

interface Stats {
  totalCandidates: string;
  verifiedHumans: string;
  activeJobs: string;
  shortlisted: string;
}

export default function RecruiterPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCandidates: '0',
    verifiedHumans: '0',
    activeJobs: '0',
    shortlisted: '0',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Chat drawer states
  const [activeChatCandidate, setActiveChatCandidate] = useState<Candidate | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: 'me' | 'them'; text: string; timestamp: Date }[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isCandidateTyping, setIsCandidateTyping] = useState(false);

  const handleOpenChat = (candidate: Candidate) => {
    setActiveChatCandidate(candidate);
    setIsCandidateTyping(false);
    setNewMessageText('');
    
    const saved = localStorage.getItem(`swipegig-chat-${candidate.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        initializeMockChat(candidate);
      }
    } else {
      initializeMockChat(candidate);
    }
  };

  const initializeMockChat = (candidate: Candidate) => {
    const starterMessages = [
      {
        id: '1',
        sender: 'them' as const,
        text: `Hey! Thanks for viewing my profile. I saw your post looking for a ${candidate.headline || 'Web3 builder'}. I am highly interested in the role!`,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      }
    ];
    setChatMessages(starterMessages);
    localStorage.setItem(`swipegig-chat-${candidate.id}`, JSON.stringify(starterMessages));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatCandidate) return;

    const myMsg = {
      id: Date.now().toString(),
      sender: 'me' as const,
      text: newMessageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...chatMessages, myMsg];
    setChatMessages(updatedMessages);
    localStorage.setItem(`swipegig-chat-${activeChatCandidate.id}`, JSON.stringify(updatedMessages));
    setNewMessageText('');

    setIsCandidateTyping(true);
    setTimeout(() => {
      setIsCandidateTyping(false);
      
      const candidateReplies = [
        `That sounds like a great project! I have experience with ${activeChatCandidate.skills.slice(0, 3).join(', ')} which fits perfectly.`,
        "I'd love to jump on a quick call to sync next week. When are you free?",
        "Yes, my GitHub activity reflects my recent work on smart contract security and optimization. I'm excited about this opportunity!",
        "Thanks for the details! I am available to start immediately and work remotely. Let me know the next steps.",
      ];
      
      const randomReply = candidateReplies[Math.floor(Math.random() * candidateReplies.length)];
      
      const replyMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'them' as const,
        text: randomReply,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, replyMsg];
      setChatMessages(finalMessages);
      localStorage.setItem(`swipegig-chat-${activeChatCandidate.id}`, JSON.stringify(finalMessages));
    }, 2000);
  };

  // Load candidates and stats from API
  const fetchCandidates = async (searchVal = '') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/recruiter/candidates?search=${encodeURIComponent(searchVal)}`);
      if (!response.ok) {
        throw new Error('Failed to load candidates.');
      }
      const data = await response.json();
      setCandidates(data.candidates || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error(error);
      toast.error('Could not load candidates list.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCandidates(searchQuery);
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Recruiter <span className="text-gradient-accent">Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and contact verified Web3 talent with real-time Proof of Humanity credentials.
            </p>
          </div>
          <button 
            onClick={() => toast.success('Job posting interface coming soon!')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-hero text-black font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer w-full sm:w-auto self-start"
          >
            <Plus className="w-4 h-4" />
            Post Job
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Seeker Profiles', value: stats.totalCandidates, icon: Users, color: 'text-blue-400' },
            { label: 'Verified Humans (G$)', value: stats.verifiedHumans, icon: Shield, color: 'text-green-400' },
            { label: 'Active Open Roles', value: stats.activeJobs, icon: Briefcase, color: 'text-purple-400' },
            { label: 'Shortlists / Applications', value: stats.shortlisted, icon: Star, color: 'text-yellow-400' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4 border border-white/5 bg-white/[0.02]"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={cn('w-4 h-4', stat.color)} />
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filtering */}
        <div className="flex gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search candidates by name, bio, role/headline, location, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 bg-transparent text-white border border-white/10"
            />
          </div>
          <button 
            onClick={() => toast.success('Advanced filters coming soon!')}
            className="p-3 rounded-xl glass hover:bg-white/10 transition-colors border border-white/10 cursor-pointer shrink-0"
            title="Filter Candidates"
          >
            <Filter className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Candidate Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 border border-white/5 bg-white/[0.01] animate-pulse h-[260px] flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-5/6" />
                </div>
                <div className="h-8 bg-white/5 rounded w-full mt-4" />
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 glass rounded-3xl border border-white/5 bg-white/[0.01]"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-2xl text-muted-foreground">
              🔍
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Candidates Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Try adjusting your keywords, search terms, or check back later as new Web3 talent verifies their profiles.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {candidates.map((candidate) => (
                <motion.div
                  key={candidate.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between border border-white/10 group bg-white/[0.01] hover:border-primary/20 relative"
                >
                  <div>
                    {/* Top Row: Avatar & Match Score */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {candidate.avatarUrl ? (
                          <img
                            src={candidate.avatarUrl}
                            alt={candidate.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xl font-bold text-white shrink-0">
                            {candidate.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white truncate text-base">{candidate.name}</h3>
                            {candidate.isVerified && (
                              <div className="text-primary shrink-0" title="GoodDollar Verified Human">
                                <Shield className="w-4 h-4 fill-primary/10" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium truncate">{candidate.headline}</p>
                          <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                            {candidate.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-green-400 font-bold text-sm bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full text-xs">
                          {candidate.matchScore}%
                        </span>
                        <span className="text-[9px] text-muted-foreground/50 mt-1">match score</span>
                      </div>
                    </div>

                    {/* Bio / Description */}
                    {candidate.bio && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed mb-4">
                        {candidate.bio}
                      </p>
                    )}

                    {/* Skills tags */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {candidate.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-medium text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 5 && (
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-medium text-muted-foreground/60">
                          +{candidate.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions / Links footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                    {/* Socials / External links */}
                    <div className="flex items-center gap-2">
                      {candidate.githubUrl && (
                        <a
                          href={candidate.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-muted-foreground hover:text-white transition-colors"
                          title="View GitHub"
                        >
                          <GithubIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {candidate.linkedinUrl && (
                        <a
                          href={candidate.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-muted-foreground hover:text-white transition-colors"
                          title="View LinkedIn"
                        >
                          <LinkedinIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Recruiter interaction buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenChat(candidate)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                        title="Send Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toast.success(`Shortlisted ${candidate.name}!`)}
                        className="px-3.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-xs font-semibold text-primary transition-colors cursor-pointer"
                      >
                        Shortlist
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Slide-out Chat Drawer */}
      <AnimatePresence>
        {activeChatCandidate && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveChatCandidate(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Chat Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-full max-w-md h-full bg-background border-l border-white/10 flex flex-col shadow-2xl z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  {activeChatCandidate.avatarUrl ? (
                    <img
                      src={activeChatCandidate.avatarUrl}
                      alt={activeChatCandidate.name}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-white text-sm">
                      {activeChatCandidate.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      {activeChatCandidate.name}
                      {activeChatCandidate.isVerified && (
                        <span title="Verified Human" className="inline-flex">
                          <Shield className="w-3.5 h-3.5 text-primary fill-primary/10" />
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{activeChatCandidate.headline}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveChatCandidate(null)}
                  className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/5 flex flex-col">
                {chatMessages.map((msg) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm',
                        isMe
                          ? 'bg-primary/20 text-white rounded-tr-none ml-auto border border-primary/25'
                          : 'bg-white/5 text-gray-200 rounded-tl-none mr-auto border border-white/5'
                      )}
                    >
                      <p>{msg.text}</p>
                      <span className="text-[8px] text-muted-foreground/50 self-end mt-1.5">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}

                {/* Typing status */}
                {isCandidateTyping && (
                  <div className="bg-white/5 text-gray-400 rounded-2xl rounded-tl-none p-3 text-xs border border-white/5 mr-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>

              {/* Form Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/[0.01] flex gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={`Message ${activeChatCandidate.name}...`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder:text-muted-foreground/30"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-white/5 text-black disabled:text-muted-foreground transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
