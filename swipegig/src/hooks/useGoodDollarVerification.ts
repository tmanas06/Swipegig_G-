'use client';

import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

interface GoodDollarStatus {
  isVerified: boolean;
  verifiedAt: string | null;
  goodDollarAddress: string | null;
  aiPromptsUsed: number;
  aiPromptsLimit: number;
  aiPromptsRemaining: number | null; // null = unlimited (verified)
}

interface UseGoodDollarVerificationReturn {
  isVerified: boolean;
  verifiedAt: Date | null;
  goodDollarAddress: string | null;
  aiPromptsUsed: number;
  aiPromptsLimit: number;
  aiPromptsRemaining: number | null;
  isLoading: boolean;
  refetch: () => void;
}

async function fetchGoodDollarStatus(privyUserId: string): Promise<GoodDollarStatus> {
  const response = await fetch('/api/gooddollar/status', {
    headers: { 'x-privy-user-id': privyUserId },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch verification status');
  }

  return response.json();
}

export function useGoodDollarVerification(): UseGoodDollarVerificationReturn {
  const { user, authenticated } = usePrivy();
  const privyUserId = user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gooddollar-status', privyUserId],
    queryFn: () => fetchGoodDollarStatus(privyUserId!),
    enabled: !!privyUserId && authenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  return {
    isVerified: data?.isVerified ?? false,
    verifiedAt: data?.verifiedAt ? new Date(data.verifiedAt) : null,
    goodDollarAddress: data?.goodDollarAddress ?? null,
    aiPromptsUsed: data?.aiPromptsUsed ?? 0,
    aiPromptsLimit: data?.aiPromptsLimit ?? 5,
    aiPromptsRemaining: data?.aiPromptsRemaining ?? null,
    isLoading,
    refetch,
  };
}
