'use client';

import { parseEther, createPublicClient, createWalletClient, custom, http } from 'viem';
import { celo } from 'viem/chains';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const G_TOKEN_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export function TipButton({
  postId,
  authorWallet,
  amount,
  onTipSuccess,
}: {
  postId: string;
  authorWallet: string;
  amount: number;
  onTipSuccess?: (newTotal: number) => void;
}) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];

  const [txState, setTxState] = useState<'idle' | 'pending' | 'confirming' | 'success'>('idle');

  const handleTip = async () => {
    if (!authorWallet) {
      toast.error("Author doesn't have a registered Celo address.");
      return;
    }

    if (!activeWallet) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const loadingToast = toast.loading(`Tipping ${amount} G$...`);
    try {
      setTxState('pending');
      
      // Ensure we are on Celo Mainnet
      await activeWallet.switchChain(42220);
      const provider = await activeWallet.getEthereumProvider();

      const publicClient = createPublicClient({
        chain: celo,
        transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'),
      });
      
      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(provider),
      });

      const gTokenAddress = (process.env.NEXT_PUBLIC_DEV_G_TOKEN || '0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475') as `0x${string}`;
      
      toast.loading('Confirm in wallet...', { id: loadingToast });
      const hash = await walletClient.writeContract({
        address: gTokenAddress,
        abi: G_TOKEN_ABI,
        functionName: 'transfer',
        account: activeWallet.address as `0x${string}`,
        args: [authorWallet as `0x${string}`, parseEther(amount.toString())],
      });

      setTxState('confirming');
      toast.loading('Waiting for confirmation...', { id: loadingToast });
      
      await publicClient.waitForTransactionReceipt({ hash });

      setTxState('success');
      
      // Record tip in DB
      if (user?.id) {
        try {
          const res = await fetch(`/api/marketplace/posts/${postId}/tip`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-privy-user-id': user.id
            },
            body: JSON.stringify({ amount, txHash: hash }),
          });
          const data = await res.json();
          if (data.tipTotal !== undefined) {
            toast.success(`✓ Successfully tipped ${amount} G$!`, { id: loadingToast });
            if (onTipSuccess) onTipSuccess(data.tipTotal);
          } else {
            toast.error(data.error || 'Failed to record tip in database', { id: loadingToast });
          }
        } catch (dbErr) {
          console.error('Failed to save tip to db:', dbErr);
          toast.error('Tip succeeded on-chain, but saving record failed.', { id: loadingToast });
        }
      } else {
        toast.success(`✓ Successfully tipped ${amount} G$!`, { id: loadingToast });
      }
    } catch (e: any) {
      console.error('Tipping error:', e);
      toast.error(e.message || 'Failed to send tipping transaction.', { id: loadingToast });
      setTxState('idle');
    }
  };

  return (
    <button
      onClick={handleTip}
      disabled={txState !== 'idle' && txState !== 'success'}
      className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-semibold 
                py-2.5 px-5 rounded-xl text-sm transition-all shadow-md shadow-green-500/10
                disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
    >
      {txState === 'pending' ? (
        'Approve in Wallet...'
      ) : txState === 'confirming' ? (
        'Confirming...'
      ) : txState === 'success' ? (
        '✓ Tipped!'
      ) : (
        <>
          <span>Tip</span>
          <span className="font-bold">{amount} G$</span>
        </>
      )}
    </button>
  );
}
