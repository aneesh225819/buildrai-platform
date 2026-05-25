import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project, User } from '@/lib/db/models';
import { Octokit } from 'octokit';

// POST /api/projects/:id/export/github - Export project to GitHub
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
    const { repositoryName, isPrivate = true, includeReadme = true, githubToken } = body;

    if (!repositoryName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token is required' },
        { status: 400 }
      );
    }

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: githubToken,
    });

    // Get authenticated user
    const {
      data: { login: username },
    } = await octokit.rest.users.getAuthenticated();

    // Create repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser(
      {
        name: repositoryName,
        private: isPrivate,
        description: project.description || `Generated with BuildrAI`,
        auto_init: false,
      }
    );

    // Create files
    const files: Array<{ path: string; content: string }> = [];

    // Add project files
    project.files.forEach((file: any) => {
      files.push({
        path: file.path,
        content: file.content,
      });
    });

    // Add README if requested and doesn't exist
    if (includeReadme) {
      const hasReadme = files.some((f) =>
        f.path.toLowerCase().includes('readme')
      );

      if (!hasReadme) {
        files.push({
          path: 'README.md',
          content: `# ${project.name}\n\n${project.description || 'No description'}\n\n## Tech Stack\n\n- Framework: ${project.settings.framework}\n- Language: ${project.settings.language}\n- Styling: ${project.settings.styling}\n\n## Getting Started\n\nInstall dependencies:\n\n\`\`\`bash\n${project.settings.packageManager} install\n\`\`\`\n\nRun development server:\n\n\`\`\`bash\n${project.settings.packageManager} run dev\n\`\`\`\n\n---\n\nGenerated with [BuildrAI](https://buildrai.io)\n`,
        });
      }
    }

    // Create .gitignore
    files.push({
      path: '.gitignore',
      content: `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/
.next/
out/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo
`,
    });

    // Upload files to GitHub
    const uploadPromises = files.map(async (file) => {
      try {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: username,
          repo: repositoryName,
          path: file.path,
          message: `Add ${file.path}`,
          content: Buffer.from(file.content).toString('base64'),
        });
      } catch (error) {
        secureError(`Error uploading file ${file.path}:`, error);
        throw error;
      }
    });

    await Promise.all(uploadPromises);

    return NextResponse.json(
      {
        success: true,
        data: {
          repositoryUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          sshUrl: repo.ssh_url,
          filesUploaded: files.length,
        },
        message: 'Project exported to GitHub successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    secureError('Error exporting to GitHub:', error);

    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid GitHub token' },
        { status: 401 }
      );
    }

    if (error.status === 422) {
      return NextResponse.json(
        { error: 'Repository name already exists or is invalid' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
