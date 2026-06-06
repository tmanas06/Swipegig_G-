import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWeeklyLeaderboard } from '@/lib/marketplace/scoring';
import { createWalletClient, createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const CREATOR_POOL_WRITE_ABI = [
  {
    name: 'distributeWeeklyBonus',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'winners', type: 'address[3]' },
      { name: 'weekOf', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

function getUTCMonday(date: Date) {
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff, 0, 0, 0, 0));
  return monday;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate with CRON_SECRET
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorPoolAddress = process.env.CREATOR_POOL_CONTRACT_ADDRESS;
    if (!creatorPoolAddress || !creatorPoolAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'CREATOR_POOL_CONTRACT_ADDRESS is not configured' },
        { status: 500 }
      );
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'PRIVATE_KEY is not configured for signing transactions' },
        { status: 500 }
      );
    }

    // 2. Calculate week start (last Monday 00:00 UTC)
    const now = new Date();
    const currentMonday = getUTCMonday(now);
    const lastMonday = new Date(currentMonday.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check if bonus was already distributed for last week to prevent double-paying
    const existingBonus = await prisma.weeklyCreatorBonus.findFirst({
      where: {
        weekOf: lastMonday,
      },
    });

    if (existingBonus) {
      return NextResponse.json(
        { message: 'Weekly bonus for last week was already distributed' },
        { status: 200 }
      );
    }

    // 3. Query all posts from that week with engagement scores and rank
    const topCreators = await getWeeklyLeaderboard(lastMonday);

    // 4. Check top 3 creators and get their addresses
    const eligibleCreators = topCreators.filter((c) => !!c.author.walletAddress);

    const account = privateKeyToAccount(
      (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`
    );
    const deployerAddress = account.address;

    // We need exactly 3 addresses. Use deployer address as fallback placeholder
    const winnersAddresses: [`0x${string}`, `0x${string}`, `0x${string}`] = [
      (eligibleCreators[0]?.author.walletAddress || deployerAddress) as `0x${string}`,
      (eligibleCreators[1]?.author.walletAddress || deployerAddress) as `0x${string}`,
      (eligibleCreators[2]?.author.walletAddress || deployerAddress) as `0x${string}`,
    ];

    // 5. Send transaction to distributeWeeklyBonus on Celo
    const celoRpc = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org';
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(celoRpc),
    });

    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(celoRpc),
    });

    console.log('[DISTRIBUTING_BONUS] Winners:', winnersAddresses, 'Week:', lastMonday.toISOString());

    const hash = await walletClient.writeContract({
      address: creatorPoolAddress as `0x${string}`,
      abi: CREATOR_POOL_WRITE_ABI,
      functionName: 'distributeWeeklyBonus',
      args: [winnersAddresses, BigInt(Math.floor(lastMonday.getTime() / 1000))],
    });

    // Wait for the transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash });

    // 6. Record WeeklyCreatorBonus entries in DB
    const bonusAmounts = [10, 5, 1];
    const createdEntries = [];

    for (let i = 0; i < Math.min(3, eligibleCreators.length); i++) {
      const creator = eligibleCreators[i];
      const entry = await prisma.weeklyCreatorBonus.create({
        data: {
          userId: creator.author.id,
          rank: i + 1,
          amount: bonusAmounts[i],
          weekOf: lastMonday,
          txHash: hash,
          score: creator.score,
        },
      });
      createdEntries.push(entry);
    }

    return NextResponse.json({
      success: true,
      txHash: hash,
      weekOf: lastMonday.toISOString(),
      winners: winnersAddresses,
      savedDbEntries: createdEntries.length,
    });
  } catch (error: any) {
    console.error('[MARKETPLACE_WEEKLY_BONUS_POST]', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
