import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWeeklyLeaderboard } from '@/lib/marketplace/scoring';
import { createPublicClient, http, formatEther } from 'viem';
import { celo } from 'viem/chains';

const CREATOR_POOL_ABI = [
  {
    name: 'poolBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function getUTCMonday(date: Date) {
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff, 0, 0, 0, 0));
  return monday;
}

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const currentMonday = getUTCMonday(now);
    const lastMonday = new Date(currentMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextMonday = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Get current week top creators
    const topCreatorsData = await getWeeklyLeaderboard(currentMonday);
    const currentWeekTopCreators = topCreatorsData.map((c, index) => ({
      rank: index + 1,
      creator: {
        id: c.author.id,
        name: c.author.name,
        avatarUrl: c.author.avatarUrl,
        walletAddress: c.author.walletAddress,
        isGoodDollarVerified: c.author.isGoodDollarVerified,
      },
      score: c.score,
      tipsEarned: c.totalTips,
      postsCount: c.postsCount,
    }));

    // 2. Get last week's winners from DB
    const lastWeekWinnersDb = await prisma.weeklyCreatorBonus.findMany({
      where: {
        weekOf: lastMonday,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        rank: 'asc',
      },
    });

    const lastWeekWinners = lastWeekWinnersDb.map((w) => ({
      rank: w.rank,
      amount: w.amount,
      txHash: w.txHash,
      score: w.score,
      creator: {
        id: w.user.id,
        name: w.user.name,
        avatarUrl: w.user.avatarUrl,
      },
    }));

    // 3. Time until next bonus payout
    const nextBonusIn = nextMonday.getTime() - now.getTime();

    // 4. Query Creator Pool balance on-chain from SwipeGigCreatorPool contract
    const creatorPoolAddress = process.env.CREATOR_POOL_CONTRACT_ADDRESS;
    const celoRpc = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org';
    
    let creatorPoolBalance = 0;

    if (creatorPoolAddress && creatorPoolAddress.startsWith('0x')) {
      try {
        const client = createPublicClient({
          chain: celo,
          transport: http(celoRpc),
        });

        const balanceWei = await client.readContract({
          address: creatorPoolAddress as `0x${string}`,
          abi: CREATOR_POOL_ABI,
          functionName: 'poolBalance',
        });

        creatorPoolBalance = parseFloat(formatEther(balanceWei));
      } catch (chainErr: any) {
        console.error('[CREATOR_POOL_CHAIN_BALANCE_ERROR]', chainErr);
      }
    }

    // 5. Query total G$ bonus distributed from database
    const distributedSum = await prisma.weeklyCreatorBonus.aggregate({
      _sum: {
        amount: true,
      },
    });
    const totalDistributed = distributedSum._sum.amount || 0;

    // 6. Query all-time top creators
    const usersWithPosts = await prisma.user.findMany({
      where: {
        posts: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        isGoodDollarVerified: true,
        walletAddress: true,
        posts: {
          select: {
            viewCount: true,
            saveCount: true,
            tipTotal: true,
            tips: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const allTimeTopCreators = usersWithPosts
      .map((user) => {
        let totalViews = 0;
        let totalSaves = 0;
        let totalTipsCount = 0;
        let totalTipsAmount = 0;

        for (const post of user.posts) {
          totalViews += post.viewCount;
          totalSaves += post.saveCount;
          totalTipsCount += post.tips.length;
          totalTipsAmount += post.tipTotal;
        }

        const score = (totalViews * 1) + (totalSaves * 3) + (totalTipsCount * 10);

        return {
          creator: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            walletAddress: user.walletAddress,
            isGoodDollarVerified: user.isGoodDollarVerified,
          },
          score,
          tipsEarned: totalTipsAmount,
          postsCount: user.posts.length,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      currentWeekTopCreators,
      lastWeekWinners,
      nextBonusIn,
      creatorPoolBalance,
      totalDistributed,
      allTimeTopCreators,
    });
  } catch (error: any) {
    console.error('[MARKETPLACE_LEADERBOARD_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
