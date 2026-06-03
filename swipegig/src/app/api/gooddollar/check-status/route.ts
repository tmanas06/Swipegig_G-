import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkGoodDollarVerification, isValidEthAddress } from '@/lib/gooddollar/identity';
import { Prisma } from '@prisma/client';

const checkStatusSchema = z.object({
  goodWalletAddress: z.string().min(1),
});

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

    // 2. Parse + validate request body
    const body = await request.json();
    const parsed = checkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Please enter a valid wallet address (0x...)' },
        { status: 400 }
      );
    }

    const { goodWalletAddress } = parsed.data;

    // Validate Ethereum address format
    if (!isValidEthAddress(goodWalletAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format', message: 'Please enter a valid wallet address (0x...)' },
        { status: 400 }
      );
    }

    // Find current user in DB
    const user = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'Redirect to login' },
        { status: 401 }
      );
    }

    // 3. Rate limit check: Prune logs older than 24 hours and count checks in the last hour
    const limitWindowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const pruneThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const [_, checkCount] = await prisma.$transaction([
      prisma.verificationCheckLog.deleteMany({
        where: {
          userId: user.id,
          checkedAt: { lt: pruneThreshold },
        },
      }),
      prisma.verificationCheckLog.count({
        where: {
          userId: user.id,
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
        userId: user.id,
      },
    });

    // 4. Query GoodDollar contract status on Celo
    let verification;
    try {
      verification = await checkGoodDollarVerification(goodWalletAddress);
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
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isGoodDollarVerified: true,
            isVerified: true, // legacy badge/score trigger
            goodDollarVerifiedAt: new Date(),
            goodDollarAddress: goodWalletAddress,
            lastAuthenticatedAt: lastAuthenticated > 0
              ? new Date(lastAuthenticated * 1000)
              : null,
            verificationExpiredAt: expiresAt ? new Date(expiresAt * 1000) : null,
            aiPromptsLimit: 999999,
          },
        });
      } catch (dbError) {
        // Handle unique constraint error: goodDollarAddress must be unique
        if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
          return NextResponse.json(
            {
              error: 'Already linked',
              message: 'This GoodWallet address is already linked to another SwipeGig account.',
            },
            { status: 400 }
          );
        }
        throw dbError;
      }

      return NextResponse.json({
        verified: true,
        goodDollarAddress: goodWalletAddress,
        lastAuthenticated,
        expiresAt,
      });
    }

    // 6. Whitelisted & Expired
    if (isWhitelisted && isExpired) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isGoodDollarVerified: false,
          goodDollarAddress: goodWalletAddress, // store it anyway
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
      message: 'No face verification found for this address. Make sure you completed verification in GoodWallet and entered the correct address.',
    });
  } catch (error: unknown) {
    console.error('[GOODDOLLAR_CHECK_STATUS_ROUTE_ERROR]', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
