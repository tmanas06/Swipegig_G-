import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseResume } from '@/lib/resume-parser';
import { triggerReward } from '@/lib/rewards';

export async function POST(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { privyId },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type;
    const fileName = file.name;

    // Parse resume text and extract metadata
    const parsedData = await parseResume(buffer, fileType);

    // Save resume to database (for this demo, we'll store a placeholder URL since we don't have S3 set up, or store a data URL)
    const fileUrl = `/uploads/${Date.now()}-${fileName}`;

    const resume = await prisma.resume.upsert({
      where: { userId: user.id },
      update: {
        fileUrl,
        fileName,
        fileType,
        parsedSkills: parsedData.skills,
        parsedExperience: parsedData.experience,
        parsedEducation: parsedData.education,
        parsedSummary: parsedData.summary,
      },
      create: {
        userId: user.id,
        fileUrl,
        fileName,
        fileType,
        parsedSkills: parsedData.skills,
        parsedExperience: parsedData.experience,
        parsedEducation: parsedData.education,
        parsedSummary: parsedData.summary,
      },
    });

    // Update user's name if parsed and not already set
    if (parsedData.name && !user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: parsedData.name },
      });
      user.name = parsedData.name;
    }

    // Merge skills with profile skills, update headline/bio
    const updatedSkills = Array.from(new Set([...(user.profile?.skills || []), ...parsedData.skills]));
    const updatedHeadline = user.profile?.headline || parsedData.headline || null;
    const updatedBio = user.profile?.bio || parsedData.summary || null;

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        skills: updatedSkills,
        headline: updatedHeadline,
        bio: updatedBio,
      },
      create: {
        userId: user.id,
        skills: updatedSkills,
        headline: updatedHeadline,
        bio: updatedBio,
      },
    });

    // Recalculate score
    let score = 0;
    if (user.name || parsedData.name) score += 15;
    if (profile.bio) score += 15;
    if (profile.headline) score += 10;
    if (profile.skills && profile.skills.length > 0) score += 15;
    if (profile.githubUrl) score += 10;
    if (profile.linkedinUrl) score += 10;
    if (profile.portfolioUrl) score += 5;
    if (profile.location) score += 5;
    if (user.isVerified) score += 10;
    // Resume exists, add 5 points (since we just created it)
    score += 5;

    const finalScore = Math.min(score, 100);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { profileScore: finalScore },
      include: { profile: true, resume: true },
    });

    if (finalScore === 100) {
      try {
        await triggerReward(user.id, 'PROFILE_COMPLETION', 100.0);
      } catch (e) {
        console.error('Error triggering reward:', e);
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      resume,
    });
  } catch (error) {
    console.error('[UPLOAD_RESUME]', error);
    return NextResponse.json({ error: 'Failed to upload and parse resume' }, { status: 500 });
  }
}
