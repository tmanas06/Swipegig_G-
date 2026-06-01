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
      include: { profile: true, resume: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tips: string[] = [];
    let score = 0;

    if (user.name) {
      score += 15;
    } else {
      tips.push('Add your full name to your profile (+15%)');
    }

    if (user.profile?.bio) {
      score += 15;
    } else {
      tips.push('Write a short bio describing your background (+15%)');
    }

    if (user.profile?.headline) {
      score += 10;
    } else {
      tips.push('Add a professional headline (+10%)');
    }

    if (user.profile?.skills && user.profile.skills.length > 0) {
      score += 15;
    } else {
      tips.push('Add your technical and soft skills (+15%)');
    }

    if (user.profile?.githubUrl) {
      score += 10;
    } else {
      tips.push('Connect your GitHub account (+10%)');
    }

    if (user.profile?.linkedinUrl) {
      score += 10;
    } else {
      tips.push('Connect your LinkedIn profile (+10%)');
    }

    if (user.profile?.portfolioUrl) {
      score += 5;
    } else {
      tips.push('Add your personal website or portfolio (+5%)');
    }

    if (user.profile?.location) {
      score += 5;
    } else {
      tips.push('Add your location or state preference (+5%)');
    }

    if (user.isVerified) {
      score += 10;
    } else {
      tips.push('Verify your identity via GoodDollar (+10%)');
    }

    if (user.resume) {
      score += 5;
    } else {
      tips.push('Upload your resume (+5%)');
    }

    const finalScore = Math.min(score, 100);

    // Sync score to user model if different
    if (user.profileScore !== finalScore) {
      await prisma.user.update({
        where: { id: user.id },
        data: { profileScore: finalScore },
      });
    }

    return NextResponse.json({
      score: finalScore,
      tips,
    });
  } catch (error) {
    console.error('[PROFILE_COMPLETENESS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
