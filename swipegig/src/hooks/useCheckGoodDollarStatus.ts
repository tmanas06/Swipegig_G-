'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

interface CheckStatusResponse {
  verified: boolean;
  reason?: string;
  message?: string;
  goodDollarAddress?: string;
  expiresAt?: number | null;
  error?: string;
}

export function useCheckGoodDollarStatus() {
  const { user } = usePrivy();
  const queryClient = useQueryClient();

  const mutation = useMutation<CheckStatusResponse, Error, string>({
    mutationFn: async (goodWalletAddress: string) => {
      const response = await fetch('/api/gooddollar/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': user?.id ?? '',
        },
        body: JSON.stringify({ goodWalletAddress }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || resData.error || 'Failed to check verification status');
      }

      return resData;
    },
    onSuccess: (data) => {
      if (data.verified) {
        queryClient.invalidateQueries({ queryKey: ['gooddollar-status'] });
      }
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    data: mutation.data ?? null,
    error: mutation.error,
  };
}
