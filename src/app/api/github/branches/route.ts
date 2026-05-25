import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import { GitHubService } from '@/lib/github/github-service';

// GET /api/github/branches - Get repository branches
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!token || !owner || !repo) {
      return NextResponse.json(
        { error: 'Token, owner, and repo are required' },
        { status: 400 }
      );
    }

    const githubService = new GitHubService(token);

    // Get branches
    const branches = await githubService.getBranches(owner, repo);

    return NextResponse.json({
      success: true,
      data: {
        branches,
        repository: `${owner}/${repo}`,
      },
    });
  } catch (error: any) {
    secureError('Error getting branches:', error);
    return NextResponse.json(
      {
        error: 'Failed to get branches',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
