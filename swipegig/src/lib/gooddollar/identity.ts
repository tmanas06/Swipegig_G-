import { createPublicClient, http, type Address } from 'viem';
import { celo } from 'viem/chains';
import {
  GOODDOLLAR_IDENTITY_CONTRACT,
  CELO_MAINNET_RPC,
  IDENTITY_CONTRACT_ABI,
} from './constants';

export interface GoodDollarVerificationResult {
  isWhitelisted: boolean;
  lastAuthenticated: number; // unix timestamp (seconds)
  isExpired: boolean;
  authenticationPeriod: number; // days
}

// Create a public client for Celo Mainnet (read-only)
function getCeloPublicClient() {
  return createPublicClient({
    chain: celo,
    transport: http(CELO_MAINNET_RPC),
  });
}

/**
 * Check if a wallet address is verified via GoodDollar Proof of Humanity.
 * Reads from the Identity contract on Celo Mainnet.
 */
export async function checkGoodDollarVerification(
  walletAddress: string
): Promise<GoodDollarVerificationResult> {
  const client = getCeloPublicClient();
  const address = walletAddress as Address;

  // Execute all three contract reads in parallel
  const [isWhitelisted, lastAuthenticatedRaw, authPeriodRaw] = await Promise.all([
    client.readContract({
      address: GOODDOLLAR_IDENTITY_CONTRACT,
      abi: IDENTITY_CONTRACT_ABI,
      functionName: 'isWhitelisted',
      args: [address],
    }),
    client.readContract({
      address: GOODDOLLAR_IDENTITY_CONTRACT,
      abi: IDENTITY_CONTRACT_ABI,
      functionName: 'lastAuthenticated',
      args: [address],
    }),
    client.readContract({
      address: GOODDOLLAR_IDENTITY_CONTRACT,
      abi: IDENTITY_CONTRACT_ABI,
      functionName: 'authenticationPeriod',
    }),
  ]);

  const lastAuthenticated = Number(lastAuthenticatedRaw);
  const authenticationPeriod = Number(authPeriodRaw);

  // Calculate if verification has expired
  // authenticationPeriod is in days, lastAuthenticated is unix timestamp
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiryThreshold = authenticationPeriod * 86400; // convert days to seconds

  // If authenticationPeriod is 0, verification never expires
  const isExpired =
    authenticationPeriod > 0 &&
    lastAuthenticated > 0 &&
    nowInSeconds - lastAuthenticated > expiryThreshold;

  return {
    isWhitelisted,
    lastAuthenticated,
    isExpired,
    authenticationPeriod,
  };
}
