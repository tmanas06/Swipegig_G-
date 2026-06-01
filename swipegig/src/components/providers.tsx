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
            id: 44787,
            name: 'Celo Alfajores Testnet',
            network: 'celo-alfajores',
            nativeCurrency: {
              name: 'CELO',
              symbol: 'CELO',
              decimals: 18,
            },
            rpcUrls: {
              default: {
                http: ['https://alfajores-forno.celo-testnet.org'],
              },
            },
            blockExplorers: {
              default: {
                name: 'Celoscan',
                url: 'https://alfajores.celoscan.io',
              },
            },
            testnet: true,
          },
          supportedChains: [
            {
              id: 44787,
              name: 'Celo Alfajores Testnet',
              network: 'celo-alfajores',
              nativeCurrency: {
                name: 'CELO',
                symbol: 'CELO',
                decimals: 18,
              },
              rpcUrls: {
                default: {
                  http: ['https://alfajores-forno.celo-testnet.org'],
                },
              },
              blockExplorers: {
                default: {
                  name: 'Celoscan',
                  url: 'https://alfajores.celoscan.io',
                },
              },
              testnet: true,
            },
          ],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthSync />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#12141a',
                color: '#f0f2f5',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                backdropFilter: 'blur(20px)',
              },
              success: {
                iconTheme: {
                  primary: '#00C853',
                  secondary: '#000000',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
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
