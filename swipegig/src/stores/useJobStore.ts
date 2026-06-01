import { create } from 'zustand';

interface JobFilters {
  search: string;
  type: string[];
  mode: string[];
  isWeb3: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  experienceLevel: string[];
  source: string[];
}

interface JobData {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  description: string;
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  location: string | null;
  type: string;
  mode: string;
  source: string;
  sourceUrl: string | null;
  isWeb3: boolean;
  experienceLevel: string | null;
  matchScore?: number;
  postedAt: string;
}

interface SwipeAction {
  jobId: string;
  action: 'save' | 'skip' | 'apply' | 'remind';
  timestamp: number;
}

interface JobState {
  // Feed
  feedJobs: JobData[];
  currentIndex: number;
  isLoadingFeed: boolean;

  // Saved
  savedJobs: JobData[];

  // Filters
  filters: JobFilters;

  // Swipe history (for undo)
  swipeHistory: SwipeAction[];

  // Actions
  setFeedJobs: (jobs: JobData[]) => void;
  addFeedJobs: (jobs: JobData[]) => void;
  nextCard: () => void;
  undoSwipe: () => void;
  setFilters: (filters: Partial<JobFilters>) => void;
  resetFilters: () => void;
  addSavedJob: (job: JobData) => void;
  removeSavedJob: (jobId: string) => void;
  recordSwipe: (action: SwipeAction) => void;
  setLoadingFeed: (loading: boolean) => void;
}

const defaultFilters: JobFilters = {
  search: '',
  type: [],
  mode: [],
  isWeb3: null,
  salaryMin: null,
  salaryMax: null,
  skills: [],
  experienceLevel: [],
  source: [],
};

export const useJobStore = create<JobState>()((set, get) => ({
  feedJobs: [],
  currentIndex: 0,
  isLoadingFeed: false,
  savedJobs: [],
  filters: defaultFilters,
  swipeHistory: [],

  setFeedJobs: (feedJobs) => set({ feedJobs, currentIndex: 0 }),

  addFeedJobs: (newJobs) =>
    set((state) => ({
      feedJobs: [...state.feedJobs, ...newJobs],
    })),

  nextCard: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.feedJobs.length),
    })),

  undoSwipe: () => {
    const { swipeHistory, currentIndex } = get();
    if (swipeHistory.length === 0 || currentIndex === 0) return;

    const lastAction = swipeHistory[swipeHistory.length - 1];

    // If it was a save, remove from saved
    if (lastAction.action === 'save') {
      set((state) => ({
        savedJobs: state.savedJobs.filter((j) => j.id !== lastAction.jobId),
      }));
    }

    set((state) => ({
      currentIndex: state.currentIndex - 1,
      swipeHistory: state.swipeHistory.slice(0, -1),
    }));
  },

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () => set({ filters: defaultFilters }),

  addSavedJob: (job) =>
    set((state) => ({
      savedJobs: [...state.savedJobs, job],
    })),

  removeSavedJob: (jobId) =>
    set((state) => ({
      savedJobs: state.savedJobs.filter((j) => j.id !== jobId),
    })),

  recordSwipe: (action) =>
    set((state) => ({
      swipeHistory: [...state.swipeHistory.slice(-4), action],
    })),

  setLoadingFeed: (isLoadingFeed) => set({ isLoadingFeed }),
}));
