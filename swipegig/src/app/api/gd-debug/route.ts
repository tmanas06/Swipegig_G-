import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, type Address } from 'viem';
import { celo } from 'viem/chains';
import {
  GOODDOLLAR_IDENTITY_CONTRACT,
  CELO_MAINNET_RPC,
  IDENTITY_CONTRACT_ABI,
} from '@/lib/gooddollar/constants';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    console.log('[GD_DEBUG] Querying Celo Mainnet for:', address);
    
    const client = createPublicClient({
      chain: celo,
      transport: http(CELO_MAINNET_RPC),
    });

    const [isWhitelisted, lastAuthenticatedRaw, authPeriodRaw] = await Promise.all([
      client.readContract({
        address: GOODDOLLAR_IDENTITY_CONTRACT,
        abi: IDENTITY_CONTRACT_ABI,
        functionName: 'isWhitelisted',
        args: [address as Address],
      }),
      client.readContract({
        address: GOODDOLLAR_IDENTITY_CONTRACT,
        abi: IDENTITY_CONTRACT_ABI,
        functionName: 'lastAuthenticated',
        args: [address as Address],
      }),
      client.readContract({
        address: GOODDOLLAR_IDENTITY_CONTRACT,
        abi: IDENTITY_CONTRACT_ABI,
        functionName: 'authenticationPeriod',
      }),
    ]);

    return NextResponse.json({
      success: true,
      address,
      contract: GOODDOLLAR_IDENTITY_CONTRACT,
      rpc: CELO_MAINNET_RPC,
      isWhitelisted,
      lastAuthenticated: Number(lastAuthenticatedRaw),
      authenticationPeriodDays: Number(authPeriodRaw),
    });
  } catch (err: any) {
    console.error('[GD_DEBUG_ERROR]', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}
