import { NextResponse } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { celoSepolia } from 'viem/chains';

// GoodDollar token is not deployed on Celo Sepolia testnet, so we only fetch native CELO balance
const FALLBACK_RPCS = [
  'https://forno.celo-sepolia.celo-testnet.org',
  'https://celo-sepolia.drpc.org',
  'https://celo-sepolia-rpc.publicnode.com',
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  let celoBalance = '0.0000';
  let gdBalance = '0.00';
  let success = false;

  for (const rpcUrl of FALLBACK_RPCS) {
    try {
      const client = createPublicClient({
        chain: celoSepolia,
        transport: http(rpcUrl, { timeout: 8000 }),
      });

      const balanceRaw = await client.getBalance({
        address: address as `0x${string}`,
      });

      celoBalance = parseFloat(formatEther(balanceRaw)).toFixed(4);
      success = true;
      break;
    } catch (err) {
      console.warn(`[BALANCE] RPC ${rpcUrl} failed:`, err);
    }
  }

  if (!success) {
    console.error('[BALANCE] All RPC endpoints failed — returning zeros');
  }

  return NextResponse.json({
    celoBalance,
    gdBalance,
    network: 'celo-sepolia',
    success,
  });
}
