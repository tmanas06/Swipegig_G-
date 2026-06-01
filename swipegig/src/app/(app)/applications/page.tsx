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
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'react-hot-toast';

type Status = 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';

interface Application {
  id: string;
  status: Status;
  appliedAt: string;
  coverLetter: string | null;
  job: {
    title: string;
    company: string;
  };
}

const columns: { status: Status; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { status: 'APPLIED', label: 'Applied', icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  { status: 'INTERVIEWING', label: 'Interviewing', icon: MessageSquare, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
  { status: 'OFFERED', label: 'Offered', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
  { status: 'REJECTED', label: 'Rejected', icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
];

export default function ApplicationsPage() {
  const { user } = useUserStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = async () => {
    if (!user?.privyId) return;
    try {
      const response = await fetch('/api/applications', {
        headers: {
          'x-privy-user-id': user.privyId,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user?.privyId]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id || !user?.privyId) return;

    // Find the application being dragged
    const appToUpdate = applications.find(a => a.id === id);
    if (!appToUpdate || appToUpdate.status === targetStatus) return;

    // Optimistically update status
    const previousApps = [...applications];
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: targetStatus } : a));

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
      setApplications(previousApps);
    }
  };

  const stats = {
    total: applications.length,
    responseRate: applications.length > 0 
      ? Math.round((applications.filter(a => a.status !== 'APPLIED').length / applications.length) * 100) 
      : 0,
    interviews: applications.filter(a => a.status === 'INTERVIEWING').length,
    offers: applications.filter(a => a.status === 'OFFERED').length,
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
              Drag and drop applications to track your progress
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colApps = applications.filter((a) => a.status === col.status);
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
                  {colApps.map((app, i) => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
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
                            {app.job?.title || 'Web3 Role'}
                          </h3>
                          <GripVertical className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity cursor-grab" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{app.job?.company || 'Web3 Company'}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(app.appliedAt)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {app.coverLetter && (
                              <span title="Cover letter attached">
                                <FileText className="w-3.5 h-3.5 text-purple-400" />
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ))}

                  {colApps.length === 0 && (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground/20 py-12 italic">
                      Drag here to update
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
