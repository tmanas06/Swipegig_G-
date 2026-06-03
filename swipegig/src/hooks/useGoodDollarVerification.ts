'use client';

import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

interface GoodDollarStatusResponse {
  isVerified: boolean;
  verifiedAt: string | null;
  goodDollarAddress: string | null;
  expiresAt: string | null;
  aiPromptsUsed: number;
  aiPromptsLimit: number;
  aiPromptsRemaining: number | null;
  isExpiringSoon: boolean;
}

export function useGoodDollarVerification() {
  const { user, authenticated } = usePrivy();
  const privyUserId = user?.id;

  const query = useQuery<GoodDollarStatusResponse>({
    queryKey: ['gooddollar-status', privyUserId],
    queryFn: async () => {
      if (!privyUserId) throw new Error('Not authenticated');
      const res = await fetch('/api/gooddollar/status', {
        headers: {
          'x-privy-user-id': privyUserId,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch verification status');
      }
      return res.json();
    },
    enabled: !!privyUserId && authenticated,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return {
    isVerified: query.data?.isVerified ?? false,
    verifiedAt: query.data?.verifiedAt ? new Date(query.data.verifiedAt) : null,
    goodDollarAddress: query.data?.goodDollarAddress ?? null,
    expiresAt: query.data?.expiresAt ? new Date(query.data.expiresAt) : null,
    aiPromptsUsed: query.data?.aiPromptsUsed ?? 0,
    aiPromptsLimit: query.data?.aiPromptsLimit ?? 5,
    aiPromptsRemaining: query.data?.aiPromptsRemaining ?? null,
    isExpiringSoon: query.data?.isExpiringSoon ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
