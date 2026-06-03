'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  GripVertical,
  FileText,
  TrendingUp,
  Loader2,
  Heart,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'react-hot-toast';

type Status = 'SAVED' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';

interface TrackerItem {
  id: string; // SavedJob id or Application id
  jobId: string;
  status: Status;
  updatedAt: string;
  coverLetter?: string | null;
  job: {
    id: string;
    title: string;
    company: string;
    description: string;
    location?: string;
  };
}

const columns: { status: Status; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { status: 'SAVED', label: 'Saved', icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/10 border-pink-500/20' },
  { status: 'APPLIED', label: 'Applied', icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  { status: 'INTERVIEWING', label: 'Interviewing', icon: MessageSquare, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
  { status: 'OFFERED', label: 'Offered', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
  { status: 'REJECTED', label: 'Rejected', icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
];

export default function ApplicationsPage() {
  const { user } = useUserStore();
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrackerItems = async () => {
    if (!user?.privyId) return;
    try {
      const [appRes, savedRes] = await Promise.all([
        fetch('/api/applications', {
          headers: { 'x-privy-user-id': user.privyId },
        }),
        fetch('/api/jobs/save', {
          headers: { 'x-privy-user-id': user.privyId },
        }),
      ]);

      let apps = [];
      let saved = [];

      if (appRes.ok) {
        const data = await appRes.json();
        apps = data.applications || [];
      }
      if (savedRes.ok) {
        const data = await savedRes.json();
        saved = data.savedJobs || [];
      }

      // Map active applications
      const appItems: TrackerItem[] = apps.map((app: any) => ({
        id: app.id,
        jobId: app.jobId,
        status: app.status as Status,
        updatedAt: app.appliedAt,
        coverLetter: app.coverLetter,
        job: app.job,
      }));

      // Filter out saved jobs that are already applied to
      const appliedJobIds = new Set(apps.map((app: any) => app.jobId));
      const savedItems: TrackerItem[] = saved
        .filter((sj: any) => sj.job && !appliedJobIds.has(sj.jobId))
        .map((sj: any) => ({
          id: sj.id,
          jobId: sj.jobId,
          status: 'SAVED' as Status,
          updatedAt: sj.savedAt,
          job: sj.job,
        }));

      setItems([...savedItems, ...appItems]);
    } catch (error) {
      console.error('Failed to fetch tracker items:', error);
      toast.error('Failed to load application tracker');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerItems();
  }, [user?.privyId]);

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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id || !user?.privyId) return;

    // Find the item being dragged
    const itemToUpdate = items.find((item) => item.id === id);
    if (!itemToUpdate || itemToUpdate.status === targetStatus) return;

    // Guard: cannot move an applied application back to SAVED
    if (targetStatus === 'SAVED') {
      toast.error('Cannot revert an active application back to saved.');
      return;
    }

    // Case 1: Dragging SAVED to APPLIED -> Trigger full application flow!
    if (itemToUpdate.status === 'SAVED' && targetStatus === 'APPLIED') {
      const applyToast = toast.loading('AI is generating a cover letter & applying...', { id: 'apply-loading' });
      try {
        // 1. Generate cover letter
        const coverLetter = await generateCoverLetter(itemToUpdate.job);

        // 2. Submit application
        const response = await fetch('/api/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-privy-user-id': user.privyId,
          },
          body: JSON.stringify({
            jobId: itemToUpdate.jobId,
            coverLetter: coverLetter || 'Standard Application',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to apply');
        }

        toast.success(`Applied to ${itemToUpdate.job.company}!`, { id: 'apply-loading' });
        fetchTrackerItems(); // Reload list to move the item to Applied column
      } catch (err) {
        console.error('Error applying from saved list:', err);
        toast.error('Failed to apply to this job', { id: 'apply-loading' });
      }
      return;
    }

    // Case 2: Dragging SAVED directly to INTERVIEWING, OFFERED, etc.
    if (itemToUpdate.status === 'SAVED') {
      toast.error('Please drag to Applied first to submit your application.');
      return;
    }

    // Case 3: Regular update between active application columns (APPLIED, INTERVIEWING, OFFERED, REJECTED)
    const previousItems = [...items];
    // Optimistic update
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: targetStatus } : item)));

    try {
      const response = await fetch('/api/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': user.privyId,
        },
        body: JSON.stringify({ id, status: targetStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status on server');
      }

      toast.success(`Moved to ${targetStatus.toLowerCase()}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
      // Revert optimistic update
      setItems(previousItems);
    }
  };

  const appliedItems = items.filter((item) => item.status !== 'SAVED');
  const stats = {
    total: appliedItems.length,
    responseRate: appliedItems.length > 0
      ? Math.round((appliedItems.filter((a) => a.status !== 'APPLIED').length / appliedItems.length) * 100)
      : 0,
    interviews: items.filter((a) => a.status === 'INTERVIEWING').length,
    offers: items.filter((a) => a.status === 'OFFERED').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Application <span className="text-gradient-accent">Tracker</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Drag and drop applications or apply to saved jobs to track your progress
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Response Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.responseRate}%</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Interviews</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.interviews}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Offers</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.offers}</p>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {columns.map((col) => {
            const colApps = items.filter((a) => a.status === col.status);
            return (
              <div
                key={col.status}
                className="flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                {/* Column Header */}
                <div className={cn('flex items-center gap-2 px-4 py-3 rounded-t-2xl border', col.bgColor)}>
                  <col.icon className={cn('w-4 h-4', col.color)} />
                  <span className={cn('text-sm font-semibold', col.color)}>{col.label}</span>
                  <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {colApps.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-1 glass rounded-b-2xl p-3 space-y-3 min-h-[400px] transition-colors duration-200">
                  {colApps.map((item, i) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-xl p-4 hover:bg-white/5 transition-all duration-200 group border border-white/5 hover:border-white/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                            {item.job?.title || 'Web3 Role'}
                          </h3>
                          <GripVertical className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity cursor-grab" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{item.job?.company || 'Web3 Company'}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {col.status === 'SAVED' ? 'Saved ' : 'Applied '}{timeAgo(item.updatedAt)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {col.status === 'SAVED' ? (
                              <span title="Drag to Applied column to submit" className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 font-medium">
                                Drag to Apply
                              </span>
                            ) : (
                              item.coverLetter && (
                                <span title="Cover letter attached">
                                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ))}

                  {colApps.length === 0 && (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground/20 py-12 italic text-center leading-relaxed">
                      {col.status === 'SAVED' 
                        ? 'Swipe right on jobs in the feed to save them here!'
                        : 'Drag here to update'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
