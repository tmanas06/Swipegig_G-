import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const [
      totalUsers,
      totalJobs,
      totalApplications,
      totalRewards,
      activeUsersLast7d,
      usersByRole,
      applicationsByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.reward.aggregate({ _sum: { amount: true } }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.application.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const contracts = {
      rewards: process.env.REWARDS_CONTRACT_ADDRESS || null,
      applications: process.env.APPLICATIONS_CONTRACT_ADDRESS || null,
      pool: process.env.POOL_CONTRACT_ADDRESS || null,
      mockGD: process.env.MOCK_GD_TOKEN_ADDRESS || null,
      deployer: process.env.DEPLOYER_ADDRESS || null,
      network: 'Celo Mainnet (42220)',
    };

    const isDeployed = (addr: string | null) =>
      addr && addr !== '0x0000000000000000000000000000000000000000';

    return NextResponse.json({
      stats: {
        totalUsers,
        totalJobs,
        totalApplications,
        totalRewardsDistributed: totalRewards._sum.amount || 0,
        activeUsersLast7d,
        usersByRole: usersByRole.reduce(
          (acc, r) => ({ ...acc, [r.role]: r._count }),
          {} as Record<string, number>
        ),
        applicationsByStatus: applicationsByStatus.reduce(
          (acc, a) => ({ ...acc, [a.status]: a._count }),
          {} as Record<string, number>
        ),
      },
      contracts: {
        ...contracts,
        allDeployed:
          isDeployed(contracts.rewards) &&
          isDeployed(contracts.applications) &&
          isDeployed(contracts.pool),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN_STATS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
