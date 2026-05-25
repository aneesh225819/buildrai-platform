import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import { GitHubService } from '@/lib/github/github-service';
import { decrypt } from '@/lib/github/crypto-utils';
import { GitHubPushOptions } from '@/types';
import { secureError, auditLog } from '@/lib/security/logger';

// POST /api/projects/:id/github/push - Push code to GitHub repository
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
      repoUrl,
      branch,
      commitMessage,
      author,
      createNewBranch = false,
      newBranchName,
      useProjectAuth = true,
    } = body;

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.files.length === 0) {
      return NextResponse.json(
        { error: 'No files to push. Generate code first.' },
        { status: 400 }
      );
    }

    // Validate commit message
    if (!commitMessage || commitMessage.trim() === '') {
      return NextResponse.json(
        { error: 'Commit message is required' },
        { status: 400 }
      );
    }

    // Prepare push options
    let pushOptions: GitHubPushOptions;

    const targetRepoUrl = repoUrl || project.github?.repoUrl;
    const targetBranch = branch || project.github?.branch || 'main';

    if (!targetRepoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    if (useProjectAuth && project.github?.connected) {
      // Use project's saved auth credentials
      if (project.github.authMethod === 'pat' && project.github.accessToken) {
        const token = decrypt(project.github.accessToken);
        pushOptions = {
          repoUrl: targetRepoUrl,
          branch: targetBranch,
          commitMessage,
          author: author || {
            name: 'BuildrAI',
            email: 'noreply@buildrai.com',
          },
          authMethod: 'pat',
          token,
        };
      } else if (
        project.github.authMethod === 'ssh' &&
        project.github.sshPrivateKey
      ) {
        const privateKey = decrypt(project.github.sshPrivateKey);
        pushOptions = {
          repoUrl: targetRepoUrl,
          branch: targetBranch,
          commitMessage,
          author: author || {
            name: 'BuildrAI',
            email: 'noreply@buildrai.com',
          },
          authMethod: 'ssh',
          sshPrivateKey: privateKey,
        };
      } else {
        return NextResponse.json(
          { error: 'No valid GitHub authentication found for this project' },
          { status: 400 }
        );
      }
    } else {
      // Use credentials from request body
      const { authMethod, token, sshPrivateKey } = body;

      if (!authMethod || !['ssh', 'pat'].includes(authMethod)) {
        return NextResponse.json(
          { error: 'Valid auth method required when not using project auth' },
          { status: 400 }
        );
      }

      if (authMethod === 'pat' && !token) {
        return NextResponse.json(
          { error: 'GitHub PAT token required' },
          { status: 400 }
        );
      }

      if (authMethod === 'ssh' && !sshPrivateKey) {
        return NextResponse.json(
          { error: 'SSH private key required' },
          { status: 400 }
        );
      }

      pushOptions = {
        repoUrl: targetRepoUrl,
        branch: targetBranch,
        commitMessage,
        author: author || {
          name: 'BuildrAI',
          email: 'noreply@buildrai.com',
        },
        authMethod,
        ...(authMethod === 'pat' ? { token } : { sshPrivateKey }),
      };
    }

    // Create new branch if requested
    if (createNewBranch && newBranchName) {
      if (pushOptions.authMethod === 'pat' && pushOptions.token) {
        const githubService = new GitHubService(pushOptions.token);
        const [owner, repo] = targetRepoUrl
          .replace('https://github.com/', '')
          .replace('.git', '')
          .split('/');

        try {
          await githubService.createBranch(
            owner,
            repo,
            newBranchName,
            targetBranch
          );
          pushOptions.branch = newBranchName;
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
          // Branch already exists, continue with push
          pushOptions.branch = newBranchName;
        }
      }
    }

    // Push to repository
    const githubService = new GitHubService();
    const commit = await githubService.pushToRepository(
      project.files,
      pushOptions
    );

    // Update GitHub sync info
    project.github = {
      ...project.github,
      connected: true,
      repoUrl: targetRepoUrl,
      branch: pushOptions.branch,
      lastSyncedAt: new Date(),
      syncStatus: 'synced',
      lastCommitSha: commit.sha,
    };

    await project.save();

    // Audit log for push operation
    auditLog(userId, 'GITHUB_PUSH', `project:${projectId}`, {
      repoUrl: targetRepoUrl,
      branch: pushOptions.branch,
      filesPushed: project.files.length,
      commitSha: commit.sha,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        commit: {
          sha: commit.sha,
          message: commit.message,
          author: commit.author,
          url: commit.url,
        },
        repoUrl: targetRepoUrl,
        branch: pushOptions.branch,
        filesPushed: project.files.length,
      },
      message: 'Code pushed to GitHub successfully',
    });
  } catch (error: any) {
    secureError('Error pushing to GitHub', error);

    // Audit log for failed push
    if (userId) {
      auditLog(userId, 'GITHUB_PUSH_FAILED', `project:${projectId}`, {
        error: error.message,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to push code to GitHub',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
