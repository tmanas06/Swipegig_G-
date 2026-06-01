import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const saveSchema = z.object({
  jobId: z.string(),
  remindAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const privyId = request.headers.get('x-privy-user-id');
    if (!privyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, remindAt } = saveSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { privyId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const savedJob = await prisma.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId } },
      update: { remindAt: remindAt ? new Date(remindAt) : null },
      create: {
        userId: user.id,
        jobId,
        remindAt: remindAt ? new Date(remindAt) : null,
      },
    });

    return NextResponse.json({ savedJob });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('[JOBS_SAVE]', error);
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

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: user.id },
      include: { job: true },
      orderBy: { savedAt: 'desc' },
    });

    return NextResponse.json({ savedJobs });
  } catch (error) {
    console.error('[JOBS_SAVED]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
