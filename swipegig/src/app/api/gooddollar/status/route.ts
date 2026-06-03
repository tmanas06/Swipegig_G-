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
        id: true,
        isGoodDollarVerified: true,
        goodDollarVerifiedAt: true,
        goodDollarAddress: true,
        verificationExpiredAt: true,
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

    let isVerified = user.isGoodDollarVerified;

    // Auto-expire if past expiry date (Option A)
    if (isVerified && user.verificationExpiredAt && user.verificationExpiredAt < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isGoodDollarVerified: false,
        },
      });
      isVerified = false;
    }

    // Determine if verification is expiring in less than 14 days
    let isExpiringSoon = false;
    if (isVerified && user.verificationExpiredAt) {
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      const msUntilExpiry = user.verificationExpiredAt.getTime() - Date.now();
      isExpiringSoon = msUntilExpiry > 0 && msUntilExpiry < fourteenDaysMs;
    }

    return NextResponse.json({
      isVerified,
      verifiedAt: user.goodDollarVerifiedAt?.toISOString() ?? null,
      goodDollarAddress: user.goodDollarAddress ?? null,
      expiresAt: user.verificationExpiredAt?.toISOString() ?? null,
      aiPromptsUsed: user.aiPromptsUsed,
      aiPromptsLimit: user.aiPromptsLimit,
      aiPromptsRemaining: isVerified ? null : Math.max(0, user.aiPromptsLimit - user.aiPromptsUsed),
      isExpiringSoon,
    });
  } catch (error: unknown) {
    console.error('[GOODDOLLAR_STATUS_ROUTE_ERROR]', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Could not fetch verification status.' },
      { status: 500 }
    );
  }
}
