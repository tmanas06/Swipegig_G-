'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUserStore } from '@/stores/useUserStore';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthSync() {
  const { authenticated, user, ready } = usePrivy();
  const { setUser, setLoading, setOnboarded, clearUser } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;

    const syncUser = async () => {
      if (authenticated && user?.id) {
        setLoading(true);
        try {
          const response = await fetch('/api/auth/me', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-privy-user-id': user.id,
            },
            body: JSON.stringify({
              email: user.email?.address || user.google?.email || user.github?.email || null,
              walletAddress: user.wallet?.address || null,
              name: user.google?.name || user.github?.name || user.name || null,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);

            // Determine if user has completed basic onboarding (has name and headline)
            const isProfileComplete = !!data.user?.name && !!data.user?.profile?.headline;
            const { isOnboarded } = useUserStore.getState();

            if (isProfileComplete && !isOnboarded) {
              setOnboarded(true);
            }

            if (!isProfileComplete && !isOnboarded && pathname !== '/onboarding' && !pathname.startsWith('/api')) {
              router.push('/onboarding');
            }
          }
        } catch (error) {
          console.error('Failed to sync user session:', error);
        } finally {
          setLoading(false);
        }
      } else {
        clearUser();
        // Redirect unauthenticated users to landing page if they try to access protected views
        if (pathname !== '/' && pathname !== '/onboarding' && !pathname.startsWith('/api')) {
          router.push('/');
        }
      }
    };

    syncUser();
  }, [authenticated, user?.id, ready, pathname, router, setUser, setLoading, setOnboarded, clearUser]);

  return null;
}
