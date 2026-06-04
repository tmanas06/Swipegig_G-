import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkGoodDollarVerification } from '@/lib/gooddollar/identity';

export async function POST(request: NextRequest) {
  try {
    // 1. Get Privy User ID from session header
    const privyUserId = request.headers.get('x-privy-user-id');
    if (!privyUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Redirect to login' },
        { status: 401 }
      );
    }

    // 2. Find current user in DB — we check THEIR Privy wallet, no input needed
    const dbUser = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: {
        id: true,
        isGoodDollarVerified: true,
        walletAddress: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found', message: 'Redirect to login' },
        { status: 401 }
      );
    }

    if (!dbUser.walletAddress) {
      return NextResponse.json(
        {
          error: 'No wallet',
          message: 'No embedded wallet found on your account. Please log out and log back in.',
        },
        { status: 400 }
      );
    }

    // 3. Rate limit check: Prune logs older than 24 hours and count checks in the last hour
    const limitWindowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const pruneThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const [, checkCount] = await prisma.$transaction([
      prisma.verificationCheckLog.deleteMany({
        where: {
          userId: dbUser.id,
          checkedAt: { lt: pruneThreshold },
        },
      }),
      prisma.verificationCheckLog.count({
        where: {
          userId: dbUser.id,
          checkedAt: { gte: limitWindowStart },
        },
      }),
    ]);

    if (checkCount >= 10) {
      return NextResponse.json(
        {
          error: 'Rate limited',
          message: 'Too many attempts. Wait 60 seconds and try again.',
        },
        { status: 429 }
      );
    }

    // Record the current check attempt in the rate limit logs
    await prisma.verificationCheckLog.create({
      data: {
        userId: dbUser.id,
      },
    });

    // 4. Query GoodDollar contract status on Celo using the user's OWN Privy wallet address
    let verification;
    try {
      verification = await checkGoodDollarVerification(dbUser.walletAddress);
    } catch (contractError) {
      console.error('[GOODDOLLAR_RPC_ERROR]', contractError);
      return NextResponse.json(
        { error: 'RPC call fails', message: 'Could not reach GoodDollar network. Try again in a moment.' },
        { status: 503 }
      );
    }

    const { isWhitelisted, lastAuthenticated, isExpired, expiresAt } = verification;

    // 5. Whitelisted & Not Expired -> Verify User
    if (isWhitelisted && !isExpired) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          isGoodDollarVerified: true,
          isVerified: true, // legacy badge/score trigger
          goodDollarVerifiedAt: new Date(),
          lastAuthenticatedAt: lastAuthenticated > 0
            ? new Date(lastAuthenticated * 1000)
            : null,
          verificationExpiredAt: expiresAt ? new Date(expiresAt * 1000) : null,
          aiPromptsLimit: 999999,
        },
      });

      return NextResponse.json({
        verified: true,
        lastAuthenticated,
        expiresAt,
      });
    }

    // 6. Whitelisted & Expired
    if (isWhitelisted && isExpired) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          isGoodDollarVerified: false,
          lastAuthenticatedAt: lastAuthenticated > 0
            ? new Date(lastAuthenticated * 1000)
            : null,
          verificationExpiredAt: expiresAt ? new Date(expiresAt * 1000) : null,
        },
      });

      return NextResponse.json({
        verified: false,
        reason: 'expired',
        message: 'Your GoodDollar verification has expired. Please re-verify at wallet.gooddollar.org to continue.',
        expiresAt,
      });
    }

    // 7. Not Whitelisted
    return NextResponse.json({
      verified: false,
      reason: 'not_verified',
      message: 'No face verification found. Make sure you completed the GoodWallet face verification — it links to your embedded wallet automatically via connectAccount().',
    });
  } catch (error: unknown) {
    console.error('[GOODDOLLAR_CHECK_STATUS_ROUTE_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Something went wrong';
    const isNetworkError = message.includes('GoodDollar network');
    return NextResponse.json(
      { error: 'Server error', message },
      { status: isNetworkError ? 503 : 500 }
    );
  }
}
