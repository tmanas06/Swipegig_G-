import { NextRequest, NextResponse } from 'next/server';
import { syncJobsFromAPIs } from '@/lib/job-sync';

// Expose POST endpoint to sync jobs from Remotive API
export async function POST(request: NextRequest) {
  try {
    const result = await syncJobsFromAPIs();
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to sync jobs' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[JOBS_SYNC_ROUTE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Expose GET endpoint for cron trigger compatibility
export async function GET(request: NextRequest) {
  try {
    const result = await syncJobsFromAPIs();
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to sync jobs' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[JOBS_SYNC_ROUTE_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
