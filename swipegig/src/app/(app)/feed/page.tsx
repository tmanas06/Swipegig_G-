'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  X,
  ArrowUp,
  Clock,
  Undo2,
  MapPin,
  Building2,
  DollarSign,
  Sparkles,
  Filter,
  Loader2,
} from 'lucide-react';
import { cn, formatCurrency, getMatchColor, getMatchBg } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'react-hot-toast';

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 0.3;

const getStableRotation = (i: number) => ((i * 37) % 8) - 4;

const getSpringProps = (i: number, swipedIndicesSet: Set<number>) => {
  const isSwiped = swipedIndicesSet.has(i);
  if (isSwiped) {
    return {
      opacity: 0,
    };
  }
  const relativeIndex = i - swipedIndicesSet.size;
  return {
    x: 0,
    y: relativeIndex * -4,
    scale: 1 - relativeIndex * 0.03,
    rot: getStableRotation(i),
    opacity: relativeIndex < 3 ? 1 : 0,
  };
};

const transformCard = (r: number, s: number) =>
  `perspective(1500px) rotateX(2deg) rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`;

function getActionLabel(dir: [number, number]): { text: string; color: string } | null {
  const [xDir, yDir] = dir;
  if (Math.abs(xDir) > Math.abs(yDir)) {
    return xDir > 0
      ? { text: 'SAVE', color: 'text-green-400' }
      : { text: 'SKIP', color: 'text-red-400' };
  }
  return yDir < 0
    ? { text: 'APPLY', color: 'text-purple-400' }
    : { text: 'LATER', color: 'text-yellow-400' };
}

function getCompanyInitial(company: string): string {
  return company.charAt(0).toUpperCase();
}

const companyColors: Record<string, string> = {
  A: 'from-purple-500 to-blue-500',
  U: 'from-pink-500 to-rose-500',
  O: 'from-blue-500 to-cyan-500',
  M: 'from-green-500 to-emerald-500',
  Z: 'from-orange-500 to-amber-500',
};

function getCompanyColor(company: string): string {
  const initial = company.charAt(0).toUpperCase();
  return companyColors[initial] || 'from-gray-500 to-gray-600';
}

function formatJobLocation(mode: string, location: string): string {
  const cleanLoc = location || '';
  if (mode === 'HYBRID') {
    return cleanLoc ? `Hybrid (${cleanLoc})` : 'Hybrid';
  }
  if (mode === 'ONSITE') {
    return cleanLoc ? `Onsite (${cleanLoc})` : 'Onsite';
  }
  if (!cleanLoc || cleanLoc.toLowerCase() === 'remote') {
    return 'Remote';
  }
  return `Remote (${cleanLoc})`;
}

export default function FeedPage() {
  const { user } = useUserStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [swipedIndices, setSwipedIndices] = useState<Set<number>>(() => new Set());
  const [actionIndicator, setActionIndicator] = useState<{ text: string; color: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active filter states used for the API call
  const [activeSearch, setActiveSearch] = useState('');
  const [activeJobType, setActiveJobType] = useState('ALL');
  const [activeJobMode, setActiveJobMode] = useState('ALL');
  const [activeIsWeb3, setActiveIsWeb3] = useState(false);

  // Modal open state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Temporary filter states inside the modal
  const [tempSearch, setTempSearch] = useState('');
  const [tempJobType, setTempJobType] = useState('ALL');
  const [tempJobMode, setTempJobMode] = useState('ALL');
  const [tempIsWeb3, setTempIsWeb3] = useState(false);

  const fetchJobs = async (filtersObj?: { search: string; type: string; mode: string; isWeb3: boolean }) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtersObj) {
        if (filtersObj.search.trim()) params.append('search', filtersObj.search.trim());
        if (filtersObj.type !== 'ALL') params.append('type', filtersObj.type);
        if (filtersObj.mode !== 'ALL') params.append('mode', filtersObj.mode);
        if (filtersObj.isWeb3) params.append('isWeb3', 'true');
      }

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const userSkills = user?.profile?.skills || [];
        
        const processedJobs = (data.jobs || []).map((job: any) => {
          // Calculate matching score: 60% base + 40% matching skills ratio
          const matchCount = job.skills.filter((s: string) => userSkills.includes(s)).length;
          const matchScore = job.skills.length > 0
            ? Math.round((matchCount / job.skills.length) * 40) + 60
            : 75;
          return {
            ...job,
            matchScore,
          };
        });

        // Sort by match score
        processedJobs.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
        setJobs(processedJobs);
        setSwipedIndices(new Set()); // Reset card deck whenever query changes
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast.error('Failed to load jobs feed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch jobs on mount, user load, or active filter changes
  useEffect(() => {
    fetchJobs({
      search: activeSearch,
      type: activeJobType,
      mode: activeJobMode,
      isWeb3: activeIsWeb3,
    });
  }, [user, activeSearch, activeJobType, activeJobMode, activeIsWeb3]);

  // Sync temporary modal filters with active applied filters on modal open
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isFilterOpen) {
      if (!dialog.open) {
        setTempSearch(activeSearch);
        setTempJobType(activeJobType);
        setTempJobMode(activeJobMode);
        setTempIsWeb3(activeIsWeb3);
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isFilterOpen, activeSearch, activeJobType, activeJobMode, activeIsWeb3]);

  const handleApplyFilters = () => {
    setActiveSearch(tempSearch);
    setActiveJobType(tempJobType);
    setActiveJobMode(tempJobMode);
    setActiveIsWeb3(tempIsWeb3);
    setIsFilterOpen(false);
    toast.success('Filters applied');
  };

  const handleClearFilters = () => {
    setTempSearch('');
    setTempJobType('ALL');
    setTempJobMode('ALL');
    setTempIsWeb3(false);

    setActiveSearch('');
    setActiveJobType('ALL');
    setActiveJobMode('ALL');
    setActiveIsWeb3(false);
    setIsFilterOpen(false);
    toast.success('Filters cleared');
  };

  const [springs, api] = useSprings(
    jobs.length,
    (i) => ({
      ...getSpringProps(i, swipedIndices),
      from: { x: 0, rot: 0, scale: 1.1, y: -1000, opacity: 0 },
      config: { tension: 500, friction: 50 },
    }),
    [jobs, swipedIndices]
  );

  // Reset deck when all jobs are swiped
  useEffect(() => {
    if (jobs.length > 0 && swipedIndices.size === jobs.length) {
      const timer = setTimeout(() => {
        setSwipedIndices(new Set());
        api.start((i) => ({
          ...getSpringProps(i, new Set()),
          config: { friction: 50, tension: 500 },
        }));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [swipedIndices.size, jobs.length, api]);

  const generateCoverLetter = async (job: any) => {
    try {
      const response = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTitle: job.title,
          jobDescription: job.description,
          companyName: job.company,
          userProfile: {
            name: user?.name,
            headline: user?.profile?.headline,
            skills: user?.profile?.skills,
            bio: user?.profile?.bio,
          },
        }),
      });

      if (!response.ok) return '';

      const reader = response.body?.getReader();
      if (!reader) return '';

      const decoder = new TextDecoder();
      let coverLetter = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                coverLetter += parsed.content;
              }
            } catch (e) {}
          }
        }
      }
      return coverLetter;
    } catch (e) {
      console.error('Failed to generate cover letter:', e);
      return '';
    }
  };

  const handleSwipeAction = async (job: any, action: 'save' | 'skip' | 'apply' | 'remind') => {
    if (!user?.privyId) {
      toast.error('Connect your account first.');
      return;
    }

    try {
      if (action === 'save') {
        const res = await fetch('/api/jobs/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-privy-user-id': user.privyId,
          },
          body: JSON.stringify({ jobId: job.id }),
        });
        if (res.ok) {
          toast.success('Saved!');
        }
      } else if (action === 'apply') {
        toast.loading('AI is crafting cover letter & applying...', { id: 'apply-loading' });

        // 1. Generate cover letter from AI
        const coverLetter = await generateCoverLetter(job);

        // 2. POST to applications endpoint
        const applyRes = await fetch('/api/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-privy-user-id': user.privyId,
          },
          body: JSON.stringify({
            jobId: job.id,
            coverLetter: coverLetter || 'Standard Application',
          }),
        });

        toast.dismiss('apply-loading');

        if (applyRes.ok) {
          toast.success(`Applied to ${job.company}!`);
        } else if (applyRes.status === 409) {
          toast.error('Already applied to this job!');
        } else {
          throw new Error('Failed to apply');
        }
      } else if (action === 'remind') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const res = await fetch('/api/jobs/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-privy-user-id': user.privyId,
          },
          body: JSON.stringify({ jobId: job.id, remindAt: tomorrow.toISOString() }),
        });
        if (res.ok) {
          toast.success('Reminder set!');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to complete action');
    }
  };

  const bind = useDrag(
    ({ args: [index], active, movement: [mx, my], direction: [xDir, yDir], velocity: [vx, vy] }) => {
      const trigger = Math.abs(mx) > SWIPE_THRESHOLD || Math.abs(my) > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY || vy > SWIPE_VELOCITY;
      const dir = Math.abs(mx) > Math.abs(my) ? (xDir < 0 ? -1 : 1) : 0;
      const yDirection = Math.abs(my) > Math.abs(mx) ? (yDir < 0 ? -1 : 1) : 0;

      if (active && (Math.abs(mx) > 30 || Math.abs(my) > 30)) {
        const label = getActionLabel([mx, my]);
        setActionIndicator(label);
      } else if (!active) {
        setActionIndicator(null);
      }

      if (!active && trigger) {
        const action = Math.abs(mx) > Math.abs(my)
          ? (xDir > 0 ? 'save' : 'skip')
          : (yDir < 0 ? 'apply' : 'remind');

        handleSwipeAction(jobs[index], action);

        setSwipedIndices(prev => {
          const next = new Set(prev);
          next.add(index);
          return next;
        });
      }

      api.start((i) => {
        // 1. If this card is already swiped
        if (swipedIndices.has(i) || (i === index && !active && trigger)) {
          // If this is the card that was just swiped on release, animate it off-screen
          if (i === index && !active && trigger) {
            const x = (200 + window.innerWidth) * dir;
            const y = Math.abs(my) > Math.abs(mx) ? (200 + window.innerHeight) * yDirection : 0;
            const rot = mx / 15 + dir * 10 * vx;
            return {
              x,
              y,
              rot,
              scale: 1,
              opacity: 0,
              config: { friction: 50, tension: 200 },
            };
          }
          return { opacity: 0 };
        }

        // 2. If this is the card currently being dragged
        if (i === index && active) {
          const x = mx;
          const y = my;
          const rot = mx / 15;
          const scale = 1.05;
          return {
            x,
            y,
            rot,
            scale,
            opacity: 1,
            config: { friction: 50, tension: 800 },
          };
        }

        // 3. For all other active cards in the stack
        const relativeIndex = i - swipedIndices.size;
        return {
          x: 0,
          y: relativeIndex * -4,
          scale: 1 - relativeIndex * 0.03,
          rot: getStableRotation(i),
          opacity: relativeIndex < 3 ? 1 : 0,
          config: { friction: 50, tension: 500 },
        };
      });
    },
    { filterTaps: true, rubberband: true }
  );

  const handleButtonSwipe = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      // Find the first index that has not been swiped yet (top card in deck is index 0)
      let currentIndex = -1;
      for (let i = 0; i < jobs.length; i++) {
        if (!swipedIndices.has(i)) {
          currentIndex = i;
          break;
        }
      }
      if (currentIndex === -1) return;

      const action = direction === 'right' ? 'save' : direction === 'left' ? 'skip' : direction === 'up' ? 'apply' : 'remind';
      handleSwipeAction(jobs[currentIndex], action);

      // 1. Animate the swiped card off screen immediately
      const x = direction === 'left' ? -1000 : direction === 'right' ? 1000 : 0;
      const y = direction === 'up' ? -1000 : direction === 'down' ? 1000 : 0;
      api.start((i) => {
        if (i !== currentIndex) return;
        return {
          x,
          y,
          rot: direction === 'left' ? -30 : direction === 'right' ? 30 : 0,
          scale: 0.8,
          opacity: 0,
          config: { friction: 50, tension: 200 },
        };
      });

      // 2. Update the swiped set state
      setSwipedIndices(prev => {
        const next = new Set(prev);
        next.add(currentIndex);
        return next;
      });
    },
    [api, swipedIndices, jobs, user]
  );

  const handleUndo = useCallback(() => {
    // Get the last swiped index
    const lastSwiped = Array.from(swipedIndices).pop();
    if (lastSwiped === undefined) return;

    // 1. Remove it from swipedIndices state
    setSwipedIndices(prev => {
      const next = new Set(prev);
      next.delete(lastSwiped);
      return next;
    });

    // 2. Animate the restored card back onto the screen
    api.start((i) => {
      if (i !== lastSwiped) return;
      const mockSet = new Set(swipedIndices);
      mockSet.delete(lastSwiped);
      return {
        ...getSpringProps(lastSwiped, mockSet),
        config: { friction: 50, tension: 500 },
      };
    });
  }, [api, swipedIndices]);

  const hasActiveFilters = activeSearch || activeJobType !== 'ALL' || activeJobMode !== 'ALL' || activeIsWeb3;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading job opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-enter" key={jobs.length}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold">
            Discover <span className="text-gradient-primary">Jobs</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobs.length - swipedIndices.size} jobs remaining today
          </p>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className={cn(
            "p-2.5 rounded-xl glass hover:bg-white/10 transition-all duration-200 relative cursor-pointer",
            hasActiveFilters && "border border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
          )}
          title="Filter Jobs"
        >
          <Filter className={cn("w-5 h-5", hasActiveFilters ? "text-primary" : "text-muted-foreground")} />
          {hasActiveFilters && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </button>
      </div>

      {/* Card Stack */}
      <div className="relative flex items-center justify-center h-[calc(100vh-220px)] lg:h-[calc(100vh-160px)] overflow-hidden animate-fade-in">
        {/* Action Indicator */}
        <AnimatePresence>
          {actionIndicator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'absolute top-8 z-50 px-6 py-3 rounded-2xl glass font-bold text-2xl shadow-2xl backdrop-blur-md',
                actionIndicator.color
              )}
            >
              {actionIndicator.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards */}
        {springs.map(({ x, y, rot, scale, opacity }, i) => {
          const job = jobs[i];
          if (!job) return null;
          const isSwiped = swipedIndices.has(i);
          return (
            <animated.div
              key={job.id}
              className={cn(
                "absolute w-[340px] sm:w-[380px] will-change-transform touch-none",
                isSwiped && "pointer-events-none"
              )}
              style={{
                x,
                y,
                opacity,
                zIndex: jobs.length - i,
              }}
            >
              <animated.div
                {...bind(i)}
                className="glass rounded-3xl p-6 cursor-grab active:cursor-grabbing gradient-border select-none bg-background/80 backdrop-blur-md shadow-2xl"
                style={{
                  transform: interpolate([rot, scale], transformCard),
                }}
              >
                {/* Company Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner',
                        getCompanyColor(job.company)
                      )}
                    >
                      {getCompanyInitial(job.company)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{job.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{job.company}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Match Score */}
                {job.matchScore && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold mb-4 border',
                      getMatchBg(job.matchScore)
                    )}
                  >
                    <Sparkles className={cn('w-3.5 h-3.5', getMatchColor(job.matchScore))} />
                    <span className={getMatchColor(job.matchScore)}>
                      {job.matchScore}% match
                    </span>
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                  {job.description}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {job.skills.slice(0, 5).map((skill: string) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-sm border-t border-border pt-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>
                      {job.salaryMin && job.salaryMax
                        ? `${formatCurrency(job.salaryMin!)} – ${formatCurrency(job.salaryMax!)}`
                        : 'Competitive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{formatJobLocation(job.mode, job.location)}</span>
                  </div>
                </div>

                {/* Web3 Badge */}
                {job.isWeb3 && (
                  <div className="mt-3 flex items-center justify-end">
                    <span className="badge-web3 text-xs px-2 py-0.5 rounded-full font-medium">
                      Web3
                    </span>
                  </div>
                )}
              </animated.div>
            </animated.div>
          );
        })}

        {/* Empty state / No jobs matching filters state */}
        {(swipedIndices.size === jobs.length || jobs.length === 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center px-6 max-w-sm"
          >
            <div className="w-20 h-20 rounded-full glass flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-lg">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            {jobs.length === 0 && hasActiveFilters ? (
              <>
                <h3 className="text-xl font-bold mb-2">No matching jobs</h3>
                <p className="text-muted-foreground mb-5 text-sm">
                  We couldn't find any opportunities matching your active filters. Try adjusting them!
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Adjust Filters
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-2">All caught up!</h3>
                <p className="text-muted-foreground text-sm">Check back later for more jobs.</p>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-3">
          {/* Undo */}
          <button
            onClick={handleUndo}
            className="w-12 h-12 rounded-full glass hover:bg-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Skip */}
          <button
            onClick={() => handleButtonSwipe('left')}
            className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            title="Skip (←)"
          >
            <X className="w-6 h-6 text-red-400" />
          </button>

          {/* Remind Later */}
          <button
            onClick={() => handleButtonSwipe('down')}
            className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            title="Remind Later (↓)"
          >
            <Clock className="w-5 h-5 text-yellow-400" />
          </button>

          {/* Save */}
          <button
            onClick={() => handleButtonSwipe('right')}
            className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            title="Save (→)"
          >
            <Heart className="w-6 h-6 text-green-400" />
          </button>

          {/* Auto-Apply */}
          <button
            onClick={() => handleButtonSwipe('up')}
            className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            title="Auto-Apply (↑)"
          >
            <ArrowUp className="w-6 h-6 text-purple-400" />
          </button>
        </div>
      </div>

      {/* Filter Modal Dialog */}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setIsFilterOpen(false);
        }}
        className="rounded-3xl p-6 glass backdrop:bg-black/60 backdrop:backdrop-blur-sm max-w-md w-full border border-white/10 bg-background/95 text-foreground overflow-visible shadow-2xl fixed inset-0 m-auto"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filter Jobs
            </h2>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Keyword */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Keyword</label>
            <input
              type="text"
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              placeholder="e.g. Solidity, Front-end, Engineer"
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none transition-all text-sm w-full text-white placeholder:text-muted-foreground"
            />
          </div>

          {/* Job Type Grid */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['ALL', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTempJobType(t)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all text-center truncate cursor-pointer',
                    tempJobType === t
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-102 font-extrabold'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  )}
                >
                  {t === 'ALL' ? 'ALL TYPES' : t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Work Mode */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Work Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['ALL', 'REMOTE', 'HYBRID', 'ONSITE'].map((m) => (
                <button
                  key={m}
                  onClick={() => setTempJobMode(m)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all text-center truncate cursor-pointer',
                    tempJobMode === m
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-102 font-extrabold'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Web3 Toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Web3 Only</span>
              <span className="text-[10px] text-muted-foreground">Show only blockchain/crypto jobs</span>
            </div>
            <button
              onClick={() => setTempIsWeb3(!tempIsWeb3)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative outline-none border border-transparent cursor-pointer',
                tempIsWeb3 ? 'bg-primary' : 'bg-white/20'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full bg-white absolute top-0.8 transition-all',
                  tempIsWeb3 ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10 mt-2">
            <button
              onClick={handleClearFilters}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-colors cursor-pointer"
            >
              Clear All
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 shadow-lg shadow-primary/20 transition-all cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
