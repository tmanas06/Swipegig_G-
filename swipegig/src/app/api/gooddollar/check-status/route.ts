import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkGoodDollarVerification } from '@/lib/gooddollar/identity';
import { VERIFIED_AI_PROMPTS_LIMIT } from '@/lib/gooddollar/constants';

const checkStatusSchema = z.object({
  walletAddress: z.string().refine(
    (val) => isAddress(val),
    { message: 'Invalid Ethereum address' }
  ),
});

export async function POST(request: NextRequest) {
  try {
    // Get privy user ID from header
    const privyUserId = request.headers.get('x-privy-user-id');
    if (!privyUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in first.' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const parsed = checkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', message: parsed.error.errors[0]?.message || 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const { walletAddress } = parsed.data;

    // Find user in DB
    const user = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: {
        id: true,
        isGoodDollarVerified: true,
        goodDollarVerifiedAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'Account not found. Please sign in again.' },
        { status: 404 }
      );
    }

    // Simple rate limiting: check if last update was within 6 seconds
    const timeSinceLastUpdate = Date.now() - new Date(user.updatedAt).getTime();
    if (timeSinceLastUpdate < 6000) {
      return NextResponse.json(
        {
          error: 'Rate limited',
          message: 'Please wait a moment before checking again.',
          verified: user.isGoodDollarVerified,
        },
        { status: 429 }
      );
    }

    // Check on-chain verification status
    const verification = await checkGoodDollarVerification(walletAddress);

    if (verification.isWhitelisted && !verification.isExpired) {
      // Verified! Update DB
      await prisma.user.update({
        where: { privyId: privyUserId },
        data: {
          isGoodDollarVerified: true,
          isVerified: true, // Also set legacy verified flag
          goodDollarVerifiedAt: new Date(),
          goodDollarAddress: walletAddress,
          lastAuthenticatedAt: verification.lastAuthenticated > 0
            ? new Date(verification.lastAuthenticated * 1000)
            : null,
          aiPromptsLimit: VERIFIED_AI_PROMPTS_LIMIT,
        },
      });

      return NextResponse.json({
        verified: true,
        lastAuthenticated: verification.lastAuthenticated,
        message: 'You are GoodDollar verified! All features are now unlocked.',
      });
    }

    if (verification.isWhitelisted && verification.isExpired) {
      // Verification expired
      await prisma.user.update({
        where: { privyId: privyUserId },
        data: {
          isGoodDollarVerified: false,
          lastAuthenticatedAt: verification.lastAuthenticated > 0
            ? new Date(verification.lastAuthenticated * 1000)
            : null,
        },
      });

      return NextResponse.json({
        verified: false,
        reason: 'expired',
        message: 'Your GoodDollar verification has expired. Please re-verify at wallet.gooddollar.org',
      });
    }

    // Not whitelisted
    return NextResponse.json({
      verified: false,
      reason: 'not_verified',
      message: 'No verification found. Complete face verification at wallet.gooddollar.org first.',
    });
  } catch (error: unknown) {
    console.error('[GOODDOLLAR_CHECK_STATUS]', error);

    // Check if it's a network/RPC error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNetworkError =
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNREFUSED');

    if (isNetworkError) {
      return NextResponse.json(
        {
          error: 'Network error',
          message: 'Could not reach the GoodDollar network. Please try again in a moment.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Server error',
        message: 'Something went wrong. Please try again.',
      },
      { status: 500 }
    );
  }
}
