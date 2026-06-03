import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users with their rewards to construct the leaderboard
    const users = await prisma.user.findMany({
      select: {
        id: true,
        privyId: true,
        name: true,
        email: true,
        walletAddress: true,
        avatarUrl: true,
        rewards: {
          select: {
            amount: true,
          },
        },
      },
    });

    // Map and aggregate scores
    const leaderboardData = users
      .map((user) => {
        const totalScore = user.rewards.reduce((sum, r) => sum + r.amount, 0);
        
        // Format display name: Name -> WalletAddress snippet -> Email prefix -> Anonymous Seeker
        let displayName = 'Anonymous Seeker';
        if (user.name) {
          displayName = user.name;
        } else if (user.walletAddress) {
          displayName = `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`;
        } else if (user.email) {
          displayName = user.email.split('@')[0];
        }

        // Generate a fallback avatar character
        const avatarChar = displayName.charAt(0).toUpperCase() || 'S';

        return {
          id: user.id,
          privyId: user.privyId,
          name: displayName,
          score: totalScore,
          avatar: avatarChar,
          avatarUrl: user.avatarUrl,
        };
      })
      // Sort desc by score, secondary sort by name
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.name.localeCompare(b.name);
      });

    // Rank the sorted list
    const rankedLeaderboard = leaderboardData.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
    });
  } catch (error) {
    console.error('[LEADERBOARD_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
