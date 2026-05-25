/**
 * Fetch Repositories API
 *
 * Fetches all repositories from the connected provider for the authenticated user.
 *
 * GET /api/integrations/[provider]/repositories
 */

// Authentication disabled for testing
// import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Integration } from '@/lib/db/models/integration';
import { decryptToken } from '@/lib/integrations/token-encryption';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  url: string;
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

    // Fetch repositories based on provider
    let repositories: Repository[] = [];

    switch (provider) {
      case 'github':
        repositories = await fetchGitHubRepositories(accessToken);
        break;
      case 'bitbucket':
        repositories = await fetchBitbucketRepositories(accessToken);
        break;
      case 'azure':
        repositories = await fetchAzureRepositories(accessToken);
        break;
    }

    // Update last used timestamp
    integration.lastUsedAt = new Date();
    await integration.save();

    return NextResponse.json({
      success: true,
      data: repositories,
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}

/**
 * Fetch repositories from GitHub
 */
async function fetchGitHubRepositories(accessToken: string): Promise<Repository[]> {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub repositories');
  }

  const repos = await response.json();

  return repos.map((repo: any) => ({
    id: repo.id.toString(),
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private,
    defaultBranch: repo.default_branch,
    url: repo.html_url,
  }));
}

/**
 * Fetch repositories from Bitbucket
 */
async function fetchBitbucketRepositories(accessToken: string): Promise<Repository[]> {
  const response = await fetch('https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Bitbucket repositories');
  }

  const data = await response.json();

  return data.values.map((repo: any) => ({
    id: repo.uuid,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.is_private,
    defaultBranch: repo.mainbranch?.name || 'main',
    url: repo.links.html.href,
  }));
}

/**
 * Fetch repositories from Azure Repos
 */
async function fetchAzureRepositories(accessToken: string): Promise<Repository[]> {
  // First, get all projects
  const projectsResponse = await fetch(
    'https://dev.azure.com/_apis/projects?api-version=7.0',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!projectsResponse.ok) {
    throw new Error('Failed to fetch Azure projects');
  }

  const projectsData = await projectsResponse.json();
  const repositories: Repository[] = [];

  // For each project, get repositories
  for (const project of projectsData.value) {
    const reposResponse = await fetch(
      `https://dev.azure.com/${project.name}/_apis/git/repositories?api-version=7.0`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (reposResponse.ok) {
      const reposData = await reposResponse.json();
      repositories.push(
        ...reposData.value.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: `${project.name}/${repo.name}`,
          description: repo.project.description,
          private: true, // Azure Repos are typically private
          defaultBranch: repo.defaultBranch || 'main',
          url: repo.webUrl,
        }))
      );
    }
  }

  return repositories;
}
