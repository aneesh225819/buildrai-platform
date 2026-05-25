import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import { GitHubService } from '@/lib/github/github-service';
import { encrypt } from '@/lib/github/crypto-utils';
import { secureError, auditLog } from '@/lib/security/logger';

// POST /api/projects/:id/github/connect - Connect GitHub account to project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  let projectId: string | undefined;

  try {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const resolvedParams = await params;
    projectId = resolvedParams.id;
    const body = await req.json();

    const {
      authMethod, // 'ssh' | 'pat'
      token, // GitHub PAT token (if authMethod = 'pat')
      sshPublicKey, // SSH public key (if authMethod = 'ssh')
      sshPrivateKey, // SSH private key (if authMethod = 'ssh')
      repoUrl, // GitHub repository URL (optional)
      repoName, // Repository name (optional)
      repoOwner, // Repository owner (optional)
      branch = 'main', // Default branch
    } = body;

    // Validate input
    if (!authMethod || !['ssh', 'pat'].includes(authMethod)) {
      return NextResponse.json(
        { error: 'Invalid auth method. Must be "ssh" or "pat"' },
        { status: 400 }
      );
    }

    if (authMethod === 'pat' && !token) {
      return NextResponse.json(
        { error: 'GitHub PAT token required for PAT auth method' },
        { status: 400 }
      );
    }

    if (authMethod === 'ssh' && (!sshPublicKey || !sshPrivateKey)) {
      return NextResponse.json(
        { error: 'SSH keys required for SSH auth method' },
        { status: 400 }
      );
    }

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify GitHub token if PAT method
    if (authMethod === 'pat') {
      const githubService = new GitHubService(token);
      const isValid = await githubService.verifyToken(token);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid GitHub token' },
          { status: 400 }
        );
      }

      // Get user info
      const userInfo = await githubService.getAuthenticatedUser();

      // Encrypt and save token
      project.github = {
        connected: true,
        repoUrl: repoUrl || undefined,
        repoName: repoName || undefined,
        repoOwner: repoOwner || userInfo.login,
        branch,
        authMethod: 'pat',
        accessToken: encrypt(token),
        lastSyncedAt: undefined,
        syncStatus: 'never',
        autoSync: false,
      };
    } else {
      // SSH method - encrypt and save SSH keys
      project.github = {
        connected: true,
        repoUrl: repoUrl || undefined,
        repoName: repoName || undefined,
        repoOwner: repoOwner || undefined,
        branch,
        authMethod: 'ssh',
        sshPublicKey,
        sshPrivateKey: encrypt(sshPrivateKey),
        lastSyncedAt: undefined,
        syncStatus: 'never',
        autoSync: false,
      };
    }

    await project.save();

    // Audit log for security tracking
    auditLog(userId, 'GITHUB_CONNECT', `project:${projectId}`, {
      authMethod,
      repoUrl: repoUrl || 'not_provided',
      success: true,
    });

    // Return success without sensitive data
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        github: {
          connected: true,
          repoUrl: project.github.repoUrl,
          repoName: project.github.repoName,
          repoOwner: project.github.repoOwner,
          branch: project.github.branch,
          authMethod: project.github.authMethod,
          syncStatus: project.github.syncStatus,
          // Don't return sensitive tokens/keys
        },
      },
      message: 'GitHub account connected successfully',
    });
  } catch (error: any) {
    secureError('Error connecting GitHub', error);

    // Audit log for failed attempt
    if (userId) {
      auditLog(userId, 'GITHUB_CONNECT_FAILED', `project:${projectId}`, {
        error: error.message,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to connect GitHub account',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/projects/:id/github/connect - Get GitHub connection status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id: projectId } = await params;
    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        github: {
          connected: project.github?.connected || false,
          repoUrl: project.github?.repoUrl,
          repoName: project.github?.repoName,
          repoOwner: project.github?.repoOwner,
          branch: project.github?.branch,
          authMethod: project.github?.authMethod,
          syncStatus: project.github?.syncStatus || 'never',
          lastSyncedAt: project.github?.lastSyncedAt,
          autoSync: project.github?.autoSync || false,
          sshPublicKey:
            project.github?.authMethod === 'ssh'
              ? project.github.sshPublicKey
              : undefined,
        },
      },
    });
  } catch (error: any) {
    secureError('Error getting GitHub status', error);
    return NextResponse.json(
      {
        error: 'Failed to get GitHub connection status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id/github/connect - Disconnect GitHub
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id: projectId } = await params;
    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Clear GitHub connection
    project.github = {
      connected: false,
      authMethod: 'none',
      syncStatus: 'never',
      autoSync: false,
    };

    await project.save();

    // Audit log for disconnection
    auditLog(userId, 'GITHUB_DISCONNECT', `project:${projectId}`, {
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'GitHub account disconnected successfully',
    });
  } catch (error: any) {
    secureError('Error disconnecting GitHub', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect GitHub account',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
