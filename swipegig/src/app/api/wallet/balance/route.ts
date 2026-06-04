import { NextResponse } from 'next/server';
import { createPublicClient, http, formatEther, type Address } from 'viem';
import { celo } from 'viem/chains';

const FALLBACK_RPCS = [
  process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org',
  'https://rpc.ankr.com/celo',
  'https://celo.drpc.org',
];

const G_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_DEV_G_TOKEN || '0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475') as Address;

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const;

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
        chain: celo,
        transport: http(rpcUrl, { timeout: 8000 }),
      });

      const [celoBalanceRaw, gdBalanceRaw] = await Promise.all([
        client.getBalance({
          address: address as Address,
        }),
        client.readContract({
          address: G_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as Address],
        }).catch((err: any) => {
          console.warn('[BALANCE] G$ token read failed, defaulting to 0:', err.message);
          return BigInt(0);
        }),
      ]);

      celoBalance = parseFloat(formatEther(celoBalanceRaw)).toFixed(4);
      gdBalance = parseFloat(formatEther(gdBalanceRaw)).toFixed(2);
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
    network: 'celo',
    success,
  });
}
