import { createWalletClient, createPublicClient, http, type Address } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { parseEther } from 'viem';
import { REWARD_AMOUNTS } from './constants';

// ── Minimal ABI for SwipeGigRewards contract ───────────────
const REWARDS_ABI = [
  {
    name: 'rewardUser',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'hasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalEarned',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'rewardPoolBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ── Wallet and public clients (lazy initialized) ───────────
let walletClient: any = null;
let publicClientInstance: any = null;

function getPublicClient(): any {
  if (!publicClientInstance) {
    publicClientInstance = createPublicClient({
      chain: celo,
      transport: http('https://forno.celo.org'),
    });
  }
  return publicClientInstance;
}

function getWalletClient(): any {
  if (!walletClient) {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not set — cannot send reward transactions');
    }
    const account = privateKeyToAccount(
      (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`
    );
    walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http('https://forno.celo.org'),
    });
  }
  return walletClient;
}

function getContractAddress(): Address {
  const addr = process.env.REWARDS_CONTRACT_ADDRESS;
  if (!addr) {
    throw new Error('REWARDS_CONTRACT_ADDRESS not set');
  }
  return addr as Address;
}

// ── Reward trigger ─────────────────────────────────────────

export type RewardType = keyof typeof REWARD_AMOUNTS;

/**
 * Trigger a G$ reward distribution to a user's Privy wallet.
 * Calls the SwipeGigRewards contract on Celo mainnet.
 *
 * @param userWalletAddress - The user's Privy embedded wallet address
 * @param rewardType - One of the predefined reward types
 * @param uniqueSuffix - Optional suffix for deduplication (e.g. job ID, user ID)
 */
export async function triggerReward(
  userWalletAddress: string,
  rewardType: RewardType,
  uniqueSuffix?: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contractAddress = getContractAddress();
    const client = getPublicClient();
    const wallet = getWalletClient();

    const reason = uniqueSuffix
      ? `${rewardType}_${uniqueSuffix}`
      : rewardType;

    // Check if already claimed (prevents wasted gas)
    const alreadyClaimed = await client.readContract({
      address: contractAddress,
      abi: REWARDS_ABI,
      functionName: 'hasClaimed',
      args: [userWalletAddress as Address, reason],
    });

    if (alreadyClaimed) {
      return { success: false, error: 'Already claimed' };
    }

    const amountStr = REWARD_AMOUNTS[rewardType];
    if (!amountStr) {
      return { success: false, error: `Unknown reward type: ${rewardType}` };
    }

    const amount = parseEther(amountStr);

    const hash = await wallet.writeContract({
      address: contractAddress,
      abi: REWARDS_ABI,
      functionName: 'rewardUser',
      args: [userWalletAddress as Address, amount, reason],
    });

    return { success: true, txHash: hash };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[REWARD_TRIGGER_ERROR]', message);
    return { success: false, error: 'Reward distribution failed' };
  }
}

/**
 * Check total earned by a user on-chain.
 */
export async function getTotalEarned(
  userWalletAddress: string
): Promise<bigint> {
  const client = getPublicClient();
  const contractAddress = getContractAddress();

  return client.readContract({
    address: contractAddress,
    abi: REWARDS_ABI,
    functionName: 'totalEarned',
    args: [userWalletAddress as Address],
  }) as Promise<bigint>;
}

/**
 * Check the reward pool balance on-chain.
 */
export async function getRewardPoolBalance(): Promise<bigint> {
  const client = getPublicClient();
  const contractAddress = getContractAddress();

  return client.readContract({
    address: contractAddress,
    abi: REWARDS_ABI,
    functionName: 'rewardPoolBalance',
  }) as Promise<bigint>;
}
