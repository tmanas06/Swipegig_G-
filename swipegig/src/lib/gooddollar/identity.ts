import { createPublicClient, http, type Address } from 'viem';
import { celo } from 'viem/chains';

// Constants
export const IDENTITY_CONTRACT_ADDRESS = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42';
export const GOODWALLET_URL = 'https://wallet.gooddollar.org';

const CELO_RPC_URL = 'https://forno.celo.org';

const IDENTITY_CONTRACT_ABI = [
  {
    name: 'isWhitelisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'lastAuthenticated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'authenticationPeriod',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Validate address format before hitting the chain
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a GoodWallet address is face-verified on-chain.
 * Reads from the Identity contract on Celo Mainnet.
 */
export async function checkGoodDollarVerification(
  goodWalletAddress: string
): Promise<{
  isWhitelisted: boolean;
  lastAuthenticated: number;    // unix timestamp, 0 if never
  isExpired: boolean;           // true if authPeriod has passed
  expiresAt: number | null;     // unix timestamp when it expires
}> {
  if (!isValidEthAddress(goodWalletAddress)) {
    throw new Error('Invalid wallet address format');
  }

  try {
    const client = createPublicClient({
      chain: celo,
      transport: http(CELO_RPC_URL),
    });

    const address = goodWalletAddress as Address;

    const [isWhitelisted, lastAuthenticatedRaw, authPeriodRaw] = await Promise.all([
      client.readContract({
        address: IDENTITY_CONTRACT_ADDRESS,
        abi: IDENTITY_CONTRACT_ABI,
        functionName: 'isWhitelisted',
        args: [address],
      }),
      client.readContract({
        address: IDENTITY_CONTRACT_ADDRESS,
        abi: IDENTITY_CONTRACT_ABI,
        functionName: 'lastAuthenticated',
        args: [address],
      }),
      client.readContract({
        address: IDENTITY_CONTRACT_ADDRESS,
        abi: IDENTITY_CONTRACT_ABI,
        functionName: 'authenticationPeriod',
      }),
    ]);

    const lastAuthenticated = Number(lastAuthenticatedRaw);
    const authPeriodDays = Number(authPeriodRaw);
    const authPeriodSeconds = authPeriodDays * 86400;

    const nowSeconds = Math.floor(Date.now() / 1000);

    // If lastAuthenticated is 0, the address has never verified
    const isExpired = lastAuthenticated === 0
      ? false
      : (nowSeconds - lastAuthenticated) > authPeriodSeconds;

    const expiresAt = lastAuthenticated === 0
      ? null
      : lastAuthenticated + authPeriodSeconds;

    return {
      isWhitelisted,
      lastAuthenticated,
      isExpired,
      expiresAt,
    };
  } catch (error) {
    console.error('Error querying GoodDollar identity contract:', error);
    throw new Error('Could not reach GoodDollar network. Please try again.');
  }
}
