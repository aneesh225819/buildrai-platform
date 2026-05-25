import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import { getJobStatus } from '@/lib/aws/redis';

// GET /api/jobs/:id - Get job status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // Get job status from Redis
    const jobStatus = await getJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user owns this job
    if (jobStatus.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: jobStatus,
    });
  } catch (error) {
    secureError('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
