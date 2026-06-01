'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUserStore } from '@/stores/useUserStore';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthSync() {
  const { authenticated, user, ready } = usePrivy();
  const { setUser, setLoading, setOnboarded } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;

    const syncUser = async () => {
      if (authenticated && user?.id) {
        setLoading(true);
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'x-privy-user-id': user.id,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);

            // Determine if user has completed basic onboarding (has name and headline)
            const isProfileComplete = !!data.user?.name && !!data.user?.profile?.headline;
            setOnboarded(isProfileComplete);

            if (!isProfileComplete && pathname !== '/onboarding' && !pathname.startsWith('/api')) {
              router.push('/onboarding');
            }
          }
        } catch (error) {
          console.error('Failed to sync user session:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        // Redirect unauthenticated users to landing page if they try to access protected views
        if (pathname !== '/' && pathname !== '/onboarding' && !pathname.startsWith('/api')) {
          router.push('/');
        }
      }
    };

    syncUser();
  }, [authenticated, user?.id, ready, pathname, router, setUser, setLoading, setOnboarded]);

  return null;
}
