import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfile {
  id: string;
  privyId: string;
  walletAddress: string | null;
  ensName: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  profileScore: number;
  isVerified: boolean;
  role: 'SEEKER' | 'RECRUITER' | 'ADMIN';
  profile: {
    bio: string | null;
    headline: string | null;
    skills: string[];
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    location: string | null;
    visibility: 'PUBLIC' | 'RECRUITERS_ONLY' | 'PRIVATE';
  } | null;
  resume: {
    fileUrl: string;
    fileName: string;
    parsedSkills: string[];
    parsedSummary: string | null;
    parsedExperience?: any;
    parsedEducation?: any;
  } | null;
}

interface UserState {
  user: UserProfile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
  updateProfile: (profile: Partial<UserProfile['profile']>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isOnboarded: false,

      setUser: (user) => set({ user, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),

      setOnboarded: (isOnboarded) => set({ isOnboarded }),

      updateProfile: (profileUpdate) => {
        const currentUser = get().user;
        if (!currentUser) return;
        set({
          user: {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              bio: profileUpdate?.bio ?? currentUser.profile?.bio ?? null,
              headline: profileUpdate?.headline ?? currentUser.profile?.headline ?? null,
              skills: profileUpdate?.skills ?? currentUser.profile?.skills ?? [],
              githubUrl: profileUpdate?.githubUrl ?? currentUser.profile?.githubUrl ?? null,
              linkedinUrl: profileUpdate?.linkedinUrl ?? currentUser.profile?.linkedinUrl ?? null,
              portfolioUrl: profileUpdate?.portfolioUrl ?? currentUser.profile?.portfolioUrl ?? null,
              location: profileUpdate?.location ?? currentUser.profile?.location ?? null,
              visibility: profileUpdate?.visibility ?? currentUser.profile?.visibility ?? 'PUBLIC',
            },
          },
        });
      },

      clearUser: () => set({ user: null, isLoading: false, isOnboarded: false }),
    }),
    {
      name: 'swipegig-user',
      partialize: (state) => ({ isOnboarded: state.isOnboarded }),
    }
  )
);
