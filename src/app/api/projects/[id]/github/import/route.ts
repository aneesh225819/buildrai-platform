import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import { GitHubService } from '@/lib/github/github-service';
import { decrypt } from '@/lib/github/crypto-utils';
import { GitHubImportOptions } from '@/types';
import { secureError, auditLog } from '@/lib/security/logger';

// POST /api/projects/:id/github/import - Import repository from GitHub
export async function POST(
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
    const body = await req.json();

    const {
      repoUrl,
      branch,
      useProjectAuth = true, // Use project's saved auth credentials
      runQualityCheck = true,
      runSecurityScan = true,
    } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Prepare import options
    let importOptions: GitHubImportOptions;

    if (useProjectAuth && project.github?.connected) {
      // Use project's saved auth credentials
      if (project.github.authMethod === 'pat' && project.github.accessToken) {
        const token = decrypt(project.github.accessToken);
        importOptions = {
          repoUrl,
          branch: branch || project.github.branch || 'main',
          authMethod: 'pat',
          token,
        };
      } else if (
        project.github.authMethod === 'ssh' &&
        project.github.sshPrivateKey
      ) {
        const privateKey = decrypt(project.github.sshPrivateKey);
        importOptions = {
          repoUrl,
          branch: branch || project.github.branch || 'main',
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

      importOptions = {
        repoUrl,
        branch: branch || 'main',
        authMethod,
        ...(authMethod === 'pat' ? { token } : { sshPrivateKey }),
      };
    }

    // Import repository
    const githubService = new GitHubService();
    const { files, lastCommitSha } = await githubService.importRepository(
      importOptions
    );

    // Add files to project
    project.files = files;
    project.updateStats();

    // Update GitHub sync info
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || '';
    const repoOwner = repoUrl.split('/').slice(-2, -1)[0] || '';

    project.github = {
      ...project.github,
      connected: true,
      repoUrl,
      repoName,
      repoOwner,
      branch: branch || project.github?.branch || 'main',
      lastSyncedAt: new Date(),
      syncStatus: 'synced',
      lastCommitSha,
    };

    await project.save();

    // Optionally trigger quality check and security scan
    const tasks = [];

    if (runQualityCheck) {
      tasks.push({
        type: 'quality_check',
        endpoint: `/api/projects/${projectId}/analyze/quality`,
      });
    }

    if (runSecurityScan) {
      tasks.push({
        type: 'security_scan',
        endpoint: `/api/projects/${projectId}/security/scan`,
      });
    }

    // Audit log for repository import
    auditLog(userId, 'GITHUB_IMPORT', `project:${projectId}`, {
      repoUrl,
      branch: branch || 'main',
      filesImported: files.length,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        filesImported: files.length,
        lastCommitSha,
        repoUrl,
        branch: branch || 'main',
        tasks: tasks.map((t) => t.type),
      },
      message: `Successfully imported ${files.length} files from repository`,
      nextSteps: tasks.length > 0 ?
        'Quality check and security scan will run automatically' :
        'You can now review and develop the code',
    });
  } catch (error: any) {
    secureError('Error importing repository', error);

    // Audit log for failed import
    auditLog(userId, 'GITHUB_IMPORT_FAILED', `project:${projectId}`, {
      error: error.message,
    });

    return NextResponse.json(
      {
        error: 'Failed to import repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
