import { NextRequest, NextResponse } from 'next/server';
import { checkGoodDollarVerification } from '@/lib/gooddollar/identity';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    console.log('[GD_DEBUG] Querying Celo Mainnet for:', address);
    
    const result = await checkGoodDollarVerification(address);

    return NextResponse.json({
      success: true,
      address,
      ...result,
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
