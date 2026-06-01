import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { privyId },
      include: { rewards: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalEarned = user.rewards.reduce((sum, r) => sum + r.amount, 0);
    const rewards = user.rewards.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      balance: totalEarned, // In a real app, this would factor in spent/transferred amounts
      totalEarned,
      history: rewards,
      streak: user.loginStreak,
    });
  } catch (error) {
    console.error('[REWARDS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
