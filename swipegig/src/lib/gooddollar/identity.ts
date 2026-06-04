import { createPublicClient, http, isAddress, type Address } from 'viem';
import { celo } from 'viem/chains';
import {
  initializeIdentityContract,
  identityV2ABI,
  chainConfigs,
  SupportedChains,
} from '@goodsdks/citizen-sdk';

// ── Constants ──────────────────────────────────────────────
export const GOODWALLET_URL = 'https://wallet.gooddollar.org';
export const DEV_G_TOKEN = '0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475';
export const REAL_G_TOKEN = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const CELO_RPC_URL = 'https://forno.celo.org';

// ── Read-only public client for Celo mainnet ───────────────
const publicClient = createPublicClient({
  chain: celo,
  transport: http(CELO_RPC_URL),
});

// ── Identity contract from SDK chain configs ───────────────
const celoConfig = chainConfigs[SupportedChains.CELO];
const identityAddress = celoConfig?.contracts?.production?.identityContract;

if (!identityAddress) {
  throw new Error('Missing GoodDollar identity contract address for Celo production');
}

// Initialize the identity contract reference (read-only, no wallet client needed)
const identityContract = initializeIdentityContract(publicClient as any, identityAddress as Address);

// ── Helpers ────────────────────────────────────────────────

/**
 * Validate Ethereum address format using viem's isAddress.
 */
export function isValidEthAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Check if a GoodWallet address is face-verified on-chain.
 * Uses initializeIdentityContract + identityV2ABI from @goodsdks/citizen-sdk.
 *
 * Reads: getWhitelistedRoot, lastAuthenticated, authenticationPeriod
 */
export async function checkGoodDollarVerification(
  goodWalletAddress: string
): Promise<{
  isWhitelisted: boolean;
  lastAuthenticated: number;
  isExpired: boolean;
  expiresAt: number | null;
}> {
  if (!isValidEthAddress(goodWalletAddress)) {
    throw new Error('Invalid wallet address format');
  }

  try {
    const addr = goodWalletAddress as Address;

    // Batch all three reads in parallel
    const [root, lastAuthRaw, authPeriodRaw] = await Promise.all([
      publicClient.readContract({
        address: identityContract.contractAddress,
        abi: identityV2ABI,
        functionName: 'getWhitelistedRoot',
        args: [addr],
      }),
      publicClient.readContract({
        address: identityContract.contractAddress,
        abi: identityV2ABI,
        functionName: 'lastAuthenticated',
        args: [addr],
      }),
      publicClient.readContract({
        address: identityContract.contractAddress,
        abi: identityV2ABI,
        functionName: 'authenticationPeriod',
      }),
    ]);

    // getWhitelistedRoot returns the root address; zero address means not whitelisted
    const isWhitelisted = (root as Address) !== ZERO_ADDRESS;

    const lastAuthenticated = Number(lastAuthRaw);
    const authPeriodDays = Number(authPeriodRaw);
    const authPeriodSeconds = authPeriodDays * 86400;

    const nowSeconds = Math.floor(Date.now() / 1000);

    // If never authenticated, not expired (just not verified)
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
