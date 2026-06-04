import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { triggerReward } from '@/lib/gooddollar/rewards';

const schema = z.object({
  rewardType: z.enum([
    'profile_complete',
    'first_application',
    'per_application',
    'interview',
    'referral',
    'review',
    'daily_streak',
  ]),
  uniqueSuffix: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const privyUserId = req.headers.get('x-privy-user-id');
    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid reward type' },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: {
        id: true,
        isGoodDollarVerified: true,
        walletAddress: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!dbUser.isGoodDollarVerified) {
      return NextResponse.json(
        { error: 'Must be GoodDollar verified to earn rewards' },
        { status: 403 }
      );
    }

    if (!dbUser.walletAddress) {
      return NextResponse.json(
        { error: 'No wallet address found' },
        { status: 400 }
      );
    }

    const result = await triggerReward(
      dbUser.walletAddress,
      parsed.data.rewardType,
      parsed.data.uniqueSuffix ?? dbUser.id
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[REWARD_TRIGGER_ROUTE_ERROR]', error);
    return NextResponse.json(
      { error: 'Reward trigger failed' },
      { status: 500 }
    );
  }
}
