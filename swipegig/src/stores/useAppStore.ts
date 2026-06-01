import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Theme
  theme: 'dark' | 'light';

  // UI
  sidebarOpen: boolean;
  activeModal: string | null;
  notifications: Notification[];

  // Actions
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  createdAt: Date;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: false,
      activeModal: null,
      notifications: [],

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      openModal: (activeModal) => set({ activeModal }),

      closeModal: () => set({ activeModal: null }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: crypto.randomUUID(),
              createdAt: new Date(),
            },
          ],
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'swipegig-app',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
