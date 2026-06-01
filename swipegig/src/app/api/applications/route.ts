import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { triggerReward } from '@/lib/rewards';

const applySchema = z.object({
  jobId: z.string(),
  coverLetter: z.string().optional(),
  resumeVersion: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = applySchema.parse(body);

    const user = await prisma.user.findUnique({ where: { privyId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: { userId_jobId: { userId: user.id, jobId: data.jobId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already applied to this job' }, { status: 409 });
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: data.jobId,
        coverLetter: data.coverLetter,
        resumeVersion: data.resumeVersion,
        status: 'APPLIED',
      },
      include: { job: true },
    });

    // Trigger G$ rewards
    try {
      const appCount = await prisma.application.count({ where: { userId: user.id } });
      if (appCount === 1) {
        await triggerReward(user.id, 'FIRST_APPLICATION', 50.0);
      } else {
        await triggerReward(user.id, 'APPLICATION', 10.0);
      }
    } catch (e) {
      console.error('Error triggering reward:', e);
    }

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('[APPLICATIONS_APPLY]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { privyId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: { job: true },
      orderBy: { appliedAt: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('[APPLICATIONS_LIST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED', 'WITHDRAWN']),
});

export async function PUT(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { privyId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, status } = updateStatusSchema.parse(body);

    const application = await prisma.application.update({
      where: {
        id,
        userId: user.id,
      },
      data: { status },
      include: { job: true },
    });

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('[APPLICATIONS_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
