import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { triggerReward } from '@/lib/rewards';

const updateSchema = z.object({
  bio: z.string().max(500).optional(),
  headline: z.string().max(200).optional(),
  skills: z.array(z.string()).optional(),
  githubUrl: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  location: z.string().max(100).optional(),
  visibility: z.enum(['PUBLIC', 'RECRUITERS_ONLY', 'PRIVATE']).optional(),
  name: z.string().max(100).optional(),
  role: z.enum(['SEEKER', 'RECRUITER']).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { privyId },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update name and role on user if provided
    const userData: Record<string, any> = {};
    if (data.name) userData.name = data.name;
    if (data.role) userData.role = data.role;
    
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({
        where: { privyId },
        data: userData,
      });
    }

    // Upsert profile
    const profileData: Record<string, unknown> = {};
    if (data.bio !== undefined) profileData.bio = data.bio;
    if (data.headline !== undefined) profileData.headline = data.headline;
    if (data.skills !== undefined) profileData.skills = data.skills;
    if (data.githubUrl !== undefined) profileData.githubUrl = data.githubUrl;
    if (data.linkedinUrl !== undefined) profileData.linkedinUrl = data.linkedinUrl;
    if (data.portfolioUrl !== undefined) profileData.portfolioUrl = data.portfolioUrl;
    if (data.location !== undefined) profileData.location = data.location;
    if (data.visibility !== undefined) profileData.visibility = data.visibility;

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
        skills: (data.skills as string[]) || [],
      },
    });

    // Calculate profile completeness
    const score = calculateProfileScore(user, profile);
    await prisma.user.update({
      where: { id: user.id },
      data: { profileScore: score },
    });

    if (score === 100) {
      try {
        await triggerReward(user.id, 'PROFILE_COMPLETION', 100.0);
      } catch (e) {
        console.error('Error triggering reward:', e);
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        resume: {
          select: {
            fileUrl: true,
            fileName: true,
            parsedSkills: true,
            parsedSummary: true,
            parsedExperience: true,
            parsedEducation: true,
          },
        },
      },
    });

    return NextResponse.json({ user: updatedUser, profile, profileScore: score });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('[PROFILE_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateProfileScore(user: Record<string, unknown>, profile: Record<string, unknown>): number {
  let score = 0;

  if (user.name) score += 15;
  if (profile.bio) score += 15;
  if (profile.headline) score += 10;
  if (profile.skills && (profile.skills as string[]).length > 0) score += 15;
  if (profile.githubUrl) score += 10;
  if (profile.linkedinUrl) score += 10;
  if (profile.portfolioUrl) score += 5;
  if (profile.location) score += 5;
  if (user.isVerified) score += 10;
  // Resume adds 5 points (checked separately)

  return Math.min(score, 100);
}
