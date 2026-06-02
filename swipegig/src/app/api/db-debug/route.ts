import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncJobsFromAPIs } from '@/lib/job-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sync = searchParams.get('sync') === 'true';

    let syncResult = null;
    if (sync) {
      console.log('[DB_DEBUG] Force syncing jobs...');
      syncResult = await syncJobsFromAPIs();
    }

    const totalJobs = await prisma.job.count();
    const remotiveJobs = await prisma.job.count({
      where: { externalId: { startsWith: 'remotive-' } }
    });
    const web3Jobs = await prisma.job.count({
      where: { isWeb3: true }
    });
    
    const sampleJobs = await prisma.job.findMany({
      select: {
        id: true,
        title: true,
        company: true,
        externalId: true,
        source: true,
        isWeb3: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      syncResult,
      totalJobs,
      remotiveJobs,
      web3Jobs,
      sampleJobs
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
