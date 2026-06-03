import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const privyUserId = request.headers.get('x-privy-user-id');
    if (!privyUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in first.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: {
        isGoodDollarVerified: true,
        goodDollarVerifiedAt: true,
        goodDollarAddress: true,
        aiPromptsUsed: true,
        aiPromptsLimit: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'Account not found.' },
        { status: 404 }
      );
    }

    const isVerified = user.isGoodDollarVerified;

    return NextResponse.json({
      isVerified,
      verifiedAt: user.goodDollarVerifiedAt?.toISOString() ?? null,
      goodDollarAddress: user.goodDollarAddress ?? null,
      aiPromptsUsed: user.aiPromptsUsed,
      aiPromptsLimit: user.aiPromptsLimit,
      aiPromptsRemaining: isVerified ? null : Math.max(0, user.aiPromptsLimit - user.aiPromptsUsed),
    });
  } catch (error: unknown) {
    console.error('[GOODDOLLAR_STATUS]', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Could not fetch verification status.' },
      { status: 500 }
    );
  }
}
