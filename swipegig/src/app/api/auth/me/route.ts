import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // In production, extract user from Privy JWT
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: { privyId },
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

    if (!user) {
      user = await prisma.user.create({
        data: {
          privyId,
          profile: {
            create: {
              skills: [],
            },
          },
        },
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
      }) as any; // Cast for simplified type compatibility
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[AUTH_ME]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
