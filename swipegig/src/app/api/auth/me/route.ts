import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, walletAddress, name } = body;

    // Upsert user and include profile + resume relations
    const user = await prisma.user.upsert({
      where: { privyId },
      update: {
        email: email || undefined,
        walletAddress: walletAddress || undefined,
        name: name || undefined,
        lastLoginAt: new Date(),
      },
      create: {
        privyId,
        email,
        walletAddress,
        name,
        lastLoginAt: new Date(),
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
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[AUTH_ME_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
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

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[AUTH_ME_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
