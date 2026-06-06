import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { syncJobsFromAPIs } from '@/lib/job-sync';

const filterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(100),
  search: z.string().optional(),
  type: z.string().optional(),
  mode: z.string().optional(),
  isWeb3: z.coerce.boolean().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  skills: z.string().optional(),
  source: z.string().optional(),
});

const SEED_JOBS = [
  {
    title: 'Senior Solidity Developer',
    company: 'Aave Protocol',
    description: 'Build and maintain core protocol smart contracts for the leading DeFi lending platform. Focus on security, efficiency, and gas optimization.',
    skills: ['Solidity', 'DeFi', 'Hardhat', 'TypeScript', 'Auditing'],
    salaryMin: 180000,
    salaryMax: 250000,
    salaryCurrency: 'USD',
    location: 'Remote',
    type: 'FULL_TIME' as const,
    mode: 'REMOTE' as const,
    source: 'WEB3_CAREER' as const,
    isWeb3: true,
    experienceLevel: 'Senior',
  },
  {
    title: 'Full-Stack Web3 Engineer',
    company: 'Uniswap Labs',
    description: 'Work on the frontend and smart contract integrations for the Uniswap protocol. Optimize user experience and interface responsiveness.',
    skills: ['React', 'TypeScript', 'Ethers.js', 'GraphQL', 'Solidity'],
    salaryMin: 160000,
    salaryMax: 220000,
    salaryCurrency: 'USD',
    location: 'New York, NY',
    type: 'FULL_TIME' as const,
    mode: 'HYBRID' as const,
    source: 'WELLFOUND' as const,
    isWeb3: true,
    experienceLevel: 'Mid-Senior',
  },
  {
    title: 'Smart Contract Auditor',
    company: 'OpenZeppelin',
    description: 'Review and audit smart contracts for security vulnerabilities across the blockchain ecosystem. Help projects launch securely.',
    skills: ['Solidity', 'Security', 'Formal Verification', 'EVM', 'Yul'],
    salaryMin: 150000,
    salaryMax: 200000,
    salaryCurrency: 'USD',
    location: 'Remote',
    type: 'FULL_TIME' as const,
    mode: 'REMOTE' as const,
    source: 'WEB3_CAREER' as const,
    isWeb3: true,
    experienceLevel: 'Senior',
  },
  {
    title: 'DeFi Protocol Engineer',
    company: 'MakerDAO',
    description: 'Design and implement new DeFi primitives and collateral integration contracts for the Maker protocol and the DAI stablecoin.',
    skills: ['Solidity', 'DeFi', 'Economics', 'Go', 'Python'],
    salaryMin: 170000,
    salaryMax: 240000,
    salaryCurrency: 'USD',
    location: 'Remote',
    type: 'FULL_TIME' as const,
    mode: 'REMOTE' as const,
    source: 'REMOTIVE' as const,
    isWeb3: true,
    experienceLevel: 'Senior',
  },
  {
    title: 'Frontend Engineer - NFT Platform',
    company: 'Zora',
    description: 'Build the next generation of NFT creation and trading tools. Ensure fast rendering and smooth wallet interaction.',
    skills: ['React', 'Next.js', 'TypeScript', 'wagmi', 'TailwindCSS'],
    salaryMin: 140000,
    salaryMax: 190000,
    salaryCurrency: 'USD',
    location: 'Remote',
    type: 'FULL_TIME' as const,
    mode: 'REMOTE' as const,
    source: 'WELLFOUND' as const,
    isWeb3: true,
    experienceLevel: 'Mid',
  }
];

export async function GET(request: NextRequest) {
  try {
    const totalCount = await prisma.job.count();
    
    if (totalCount === 0) {
      console.log('[JOBS_API] Database is empty. Seeding default Web3 jobs...');
      await prisma.job.createMany({
        data: SEED_JOBS,
      });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    const filters = filterSchema.parse(params);

    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.mode) {
      where.mode = filters.mode;
    }

    if (filters.isWeb3 !== undefined) {
      where.isWeb3 = filters.isWeb3;
    }

    if (filters.salaryMin) {
      where.salaryMax = { gte: filters.salaryMin };
    }

    if (filters.salaryMax) {
      where.salaryMin = { lte: filters.salaryMax };
    }

    if (filters.skills) {
      const skillList = filters.skills.split(',');
      where.skills = { hasSome: skillList };
    }

    if (filters.source) {
      where.source = filters.source;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error('[JOBS_LIST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
