'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

type CheckResult = 'verified' | 'not_verified' | 'expired' | null;

interface CheckStatusResponse {
  verified: boolean;
  reason?: string;
  message?: string;
  lastAuthenticated?: number;
  error?: string;
}

interface UseCheckGoodDollarStatusReturn {
  checkStatus: (walletAddress: string) => Promise<void>;
  isChecking: boolean;
  result: CheckResult;
  message: string | null;
  error: string | null;
  reset: () => void;
}

export function useCheckGoodDollarStatus(): UseCheckGoodDollarStatusReturn {
  const { user } = usePrivy();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<CheckResult>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (walletAddress: string): Promise<CheckStatusResponse> => {
      const response = await fetch('/api/gooddollar/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': user?.id ?? '',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data: CheckStatusResponse = await response.json();

      if (!response.ok && response.status !== 429) {
        throw new Error(data.message || data.error || 'Failed to check status');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.verified) {
        setResult('verified');
        setMessage(data.message || 'You are GoodDollar verified!');
        setError(null);
        // Invalidate the status query so all gates update
        queryClient.invalidateQueries({ queryKey: ['gooddollar-status'] });
      } else if (data.reason === 'expired') {
        setResult('expired');
        setMessage(data.message || 'Your verification has expired.');
        setError(null);
      } else {
        setResult('not_verified');
        setMessage(data.message || 'Not verified yet.');
        setError(null);
      }
    },
    onError: (err: Error) => {
      setResult(null);
      setMessage(null);
      setError(err.message || 'Could not check verification status. Please try again.');
    },
  });

  const checkStatus = useCallback(
    async (walletAddress: string) => {
      setResult(null);
      setMessage(null);
      setError(null);
      await mutation.mutateAsync(walletAddress);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    setResult(null);
    setMessage(null);
    setError(null);
  }, []);

  return {
    checkStatus,
    isChecking: mutation.isPending,
    result,
    message,
    error,
    reset,
  };
}
