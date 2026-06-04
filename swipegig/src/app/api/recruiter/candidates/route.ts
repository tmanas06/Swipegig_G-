import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Check seeker count
    let seekerCount = await prisma.user.count({ where: { role: 'SEEKER' } });

    // Auto-seed mock seekers if none exist in the database (ensuring the recruiter dashboard is populated)
    if (seekerCount === 0) {
      const mockSeekers = [
        {
          privyId: 'did:privy:seeker1',
          walletAddress: '0x9b75B85b765610b2958516fb27049a79dd65A71F',
          name: 'Alex Chen',
          isGoodDollarVerified: true,
          profile: {
            headline: 'Senior Solidity Developer',
            bio: 'Passionate smart contract engineer with 4+ years of experience designing secure DeFi protocols. Contributed to major open-source liquidity hubs.',
            skills: ['Solidity', 'DeFi', 'Hardhat', 'TypeScript', 'Foundry'],
            location: 'San Francisco, CA',
            githubUrl: 'https://github.com/alexchen-sol',
            linkedinUrl: 'https://linkedin.com/in/alexchen-sol',
          }
        },
        {
          privyId: 'did:privy:seeker2',
          walletAddress: '0xA1B2C3D4E5F6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
          name: 'Sarah Kim',
          isGoodDollarVerified: true,
          profile: {
            headline: 'Full-Stack Web3 Engineer',
            bio: 'Building beautiful frontends for decentralized applications. Focused on user experience, responsive designs, and Web3 wallet integrations.',
            skills: ['React', 'Next.js', 'Solidity', 'GraphQL', 'TailwindCSS'],
            location: 'New York, NY',
            githubUrl: 'https://github.com/sarahkim-web3',
            linkedinUrl: 'https://linkedin.com/in/sarahkim-web3',
          }
        },
        {
          privyId: 'did:privy:seeker3',
          walletAddress: '0x0987654321fedcba0987654321fedcba09876543',
          name: 'Marcus Johnson',
          isGoodDollarVerified: false,
          profile: {
            headline: 'Smart Contract Auditor',
            bio: 'Auditing smart contracts and identifying vulnerabilities in complex protocol logics. Deep understanding of EVM assembly and security standards.',
            skills: ['Security', 'Solidity', 'Yul', 'Formal Verification', 'Vyper'],
            location: 'London, UK',
            githubUrl: 'https://github.com/marcusj-security',
            linkedinUrl: 'https://linkedin.com/in/marcusj-security',
          }
        },
        {
          privyId: 'did:privy:seeker4',
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          name: 'Priya Patel',
          isGoodDollarVerified: true,
          profile: {
            headline: 'DeFi Protocol Engineer',
            bio: 'Focused on protocol efficiency, high-performance execution pools, and cross-chain bridging mechanisms. Rust and Solidity specialist.',
            skills: ['Solidity', 'Rust', 'DeFi', 'MEV', 'Go'],
            location: 'Remote',
            githubUrl: 'https://github.com/priyapatel-defi',
            linkedinUrl: 'https://linkedin.com/in/priyapatel-defi',
          }
        }
      ];

      for (const seeker of mockSeekers) {
        await prisma.user.upsert({
          where: { privyId: seeker.privyId },
          update: {},
          create: {
            privyId: seeker.privyId,
            walletAddress: seeker.walletAddress,
            name: seeker.name,
            role: 'SEEKER',
            isGoodDollarVerified: seeker.isGoodDollarVerified,
            isVerified: seeker.isGoodDollarVerified,
            profile: {
              create: {
                headline: seeker.profile.headline,
                bio: seeker.profile.bio,
                skills: seeker.profile.skills,
                location: seeker.profile.location,
                githubUrl: seeker.profile.githubUrl,
                linkedinUrl: seeker.profile.linkedinUrl,
                visibility: 'PUBLIC',
              }
            }
          }
        });
      }
    }

    // Calculate recruiter stats dynamically
    const [totalCandidates, verifiedHumans, activeJobs, totalApplications] = await Promise.all([
      prisma.user.count({ where: { role: 'SEEKER' } }),
      prisma.user.count({ where: { role: 'SEEKER', isGoodDollarVerified: true } }),
      prisma.job.count({}), // active jobs
      prisma.application.count({}), // total applications
    ]);

    // Fetch seeker users with profiles and resumes
    // We respect privacy by only showing seekers who have profiles and whose visibility is PUBLIC or RECRUITERS_ONLY
    const seekers = await prisma.user.findMany({
      where: {
        role: 'SEEKER',
        profile: {
          is: {
            visibility: { in: ['PUBLIC', 'RECRUITERS_ONLY'] },
          },
        },
      },
      include: {
        profile: true,
        resume: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map database models to clean API response objects
    let candidates = seekers.map((u) => {
      // Calculate simple match score based on profile completion or arbitrary baseline
      let matchScore = 70;
      if (u.profile?.skills && u.profile.skills.length > 0) matchScore += 10;
      if (u.isGoodDollarVerified) matchScore += 15;
      if (u.profile?.githubUrl) matchScore += 5;
      matchScore = Math.min(matchScore, 99);

      return {
        id: u.id,
        name: u.name || 'Anonymous Builder',
        avatarUrl: u.avatarUrl,
        headline: u.profile?.headline || 'Web3 Builder',
        skills: u.profile?.skills || [],
        isVerified: u.isGoodDollarVerified,
        matchScore,
        githubActivity: u.profile?.githubUrl ? 'High' : 'Medium',
        githubUrl: u.profile?.githubUrl,
        linkedinUrl: u.profile?.linkedinUrl,
        portfolioUrl: u.profile?.portfolioUrl,
        location: u.profile?.location || 'Remote',
        bio: u.profile?.bio || '',
      };
    });

    // Perform case-insensitive search filter in-memory for rich matches across name, headline, location, and skills
    if (search) {
      const query = search.toLowerCase();
      candidates = candidates.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(query);
        const headlineMatch = c.headline.toLowerCase().includes(query);
        const locationMatch = c.location.toLowerCase().includes(query);
        const skillsMatch = c.skills.some((s) => s.toLowerCase().includes(query));
        const bioMatch = c.bio.toLowerCase().includes(query);
        return nameMatch || headlineMatch || locationMatch || skillsMatch || bioMatch;
      });
    }

    return NextResponse.json({
      stats: {
        totalCandidates: totalCandidates.toLocaleString(),
        verifiedHumans: verifiedHumans.toLocaleString(),
        activeJobs: activeJobs.toLocaleString(),
        shortlisted: totalApplications.toLocaleString(), // Using total applications as active pipeline/shortlists metric
      },
      candidates,
    });
  } catch (error: any) {
    console.error('[RECRUITER_CANDIDATES_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
