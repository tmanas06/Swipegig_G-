'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import AuthSync from '@/components/layout/AuthSync';

function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            const stored = JSON.parse(localStorage.getItem('swipegig-app') || '{}');
            const theme = stored?.state?.theme || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
          } catch (e) {
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        `,
      }}
    />
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <>
      <ThemeScript />
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
        config={{
          appearance: {
            theme: 'dark',
            accentColor: '#00C853',
            logo: '/logo.svg',
            showWalletLoginFirst: false,
          },
          loginMethods: ['email', 'google', 'twitter', 'discord', 'wallet'],
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets',
            },
          },
          defaultChain: {
            id: 42220,
            name: 'Celo',
            network: 'celo',
            nativeCurrency: {
              name: 'CELO',
              symbol: 'CELO',
              decimals: 18,
            },
            rpcUrls: {
              default: {
                http: ['https://forno.celo.org'],
              },
            },
            blockExplorers: {
              default: {
                name: 'Celoscan',
                url: 'https://celoscan.io',
              },
            },
          },
          supportedChains: [
            {
              id: 42220,
              name: 'Celo',
              network: 'celo',
              nativeCurrency: {
                name: 'CELO',
                symbol: 'CELO',
                decimals: 18,
              },
              rpcUrls: {
                default: {
                  http: ['https://forno.celo.org'],
                },
              },
              blockExplorers: {
                default: {
                  name: 'Celoscan',
                  url: 'https://celoscan.io',
                },
              },
            },
          ],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthSync />
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2500,
              style: {
                background: 'var(--card)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '500',
                padding: '10px 16px',
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.15)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--primary)',
                  secondary: 'var(--primary-foreground)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--destructive)',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </QueryClientProvider>
      </PrivyProvider>
    </>
  );
}
