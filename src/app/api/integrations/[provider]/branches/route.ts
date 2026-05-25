/**
 * Fetch Repository Branches API
 *
 * Fetches all branches for a specific repository from the connected provider.
 *
 * GET /api/integrations/[provider]/branches?repository=<repo-id>
 */

// Authentication disabled for testing
// import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Integration } from '@/lib/db/models/integration';
import { decryptToken } from '@/lib/integrations/token-encryption';

interface Branch {
  name: string;
  commit: {
    sha: string;
    message?: string;
  };
  protected: boolean;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    // Authentication disabled for testing
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // For testing, use a mock user ID
    const userId = 'test-user-id';

    const params = await context.params;
    const { provider } = params;
    const searchParams = req.nextUrl.searchParams;
    const repository = searchParams.get('repository');
    const owner = searchParams.get('owner'); // For GitHub/Bitbucket

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository parameter is required' },
        { status: 400 }
      );
    }

    // Validate provider
    if (!['github', 'bitbucket', 'azure'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get integration for this user and provider
    const integration = await Integration.findOne({
      userId,
      provider,
      isActive: true,
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found. Please connect your account first.' },
        { status: 404 }
      );
    }

    // Decrypt access token
    const accessToken = decryptToken(integration.accessToken);

    // Fetch branches based on provider
    let branches: Branch[] = [];

    switch (provider) {
      case 'github':
        if (!owner) {
          return NextResponse.json(
            { error: 'Owner parameter is required for GitHub' },
            { status: 400 }
          );
        }
        branches = await fetchGitHubBranches(accessToken, owner, repository);
        break;
      case 'bitbucket':
        if (!owner) {
          return NextResponse.json(
            { error: 'Owner parameter is required for Bitbucket' },
            { status: 400 }
          );
        }
        branches = await fetchBitbucketBranches(accessToken, owner, repository);
        break;
      case 'azure':
        branches = await fetchAzureBranches(accessToken, repository);
        break;
    }

    // Update last used timestamp
    integration.lastUsedAt = new Date();
    await integration.save();

    return NextResponse.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}

/**
 * Fetch branches from GitHub
 */
async function fetchGitHubBranches(
  accessToken: string,
  owner: string,
  repo: string
): Promise<Branch[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub branches');
  }

  const branches = await response.json();

  return branches.map((branch: any) => ({
    name: branch.name,
    commit: {
      sha: branch.commit.sha,
    },
    protected: branch.protected,
  }));
}

/**
 * Fetch branches from Bitbucket
 */
async function fetchBitbucketBranches(
  accessToken: string,
  workspace: string,
  repoSlug: string
): Promise<Branch[]> {
  const response = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches?pagelen=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Bitbucket branches');
  }

  const data = await response.json();

  return data.values.map((branch: any) => ({
    name: branch.name,
    commit: {
      sha: branch.target.hash,
      message: branch.target.message,
    },
    protected: false, // Bitbucket doesn't expose this in branch list
  }));
}

/**
 * Fetch branches from Azure Repos
 */
async function fetchAzureBranches(
  accessToken: string,
  repositoryId: string
): Promise<Branch[]> {
  const response = await fetch(
    `https://dev.azure.com/_apis/git/repositories/${repositoryId}/refs?filter=heads/&api-version=7.0`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Azure branches');
  }

  const data = await response.json();

  return data.value.map((ref: any) => ({
    name: ref.name.replace('refs/heads/', ''),
    commit: {
      sha: ref.objectId,
    },
    protected: false,
  }));
}
