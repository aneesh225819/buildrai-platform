import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import { GitHubService } from '@/lib/github/github-service';

// GET /api/github/repositories - List user's GitHub repositories
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '30');

    if (!token) {
      return NextResponse.json(
        { error: 'GitHub token is required' },
        { status: 400 }
      );
    }

    const githubService = new GitHubService(token);

    // Verify token first
    const isValid = await githubService.verifyToken(token);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid GitHub token' }, { status: 401 });
    }

    // Get repositories
    const repositories = await githubService.listRepositories(page, perPage);

    return NextResponse.json({
      success: true,
      data: {
        repositories,
        pagination: {
          page,
          perPage,
          total: repositories.length,
        },
      },
    });
  } catch (error: any) {
    secureError('Error listing repositories:', error);
    return NextResponse.json(
      {
        error: 'Failed to list repositories',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
