// Authentication disabled for testing
// import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project, User } from '@/lib/db/models';
import { generateCode } from '@/lib/ai/code-generator';
import crypto from 'crypto';

// POST /api/generate/code - Generate code files
export async function POST(req: NextRequest) {
  try {
    // const { userId } = await auth();

    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectDB();

    const body = await req.json();
    const { projectId, requirements, model, context } = body;

    if (!projectId || !requirements) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate model if provided
    const validModels = ['claude-sonnet-4-6', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'];
    const selectedModel = model && validModels.includes(model) ? model : 'claude-sonnet-4-6';

    // Get project (without userId filter for testing)
    const project = await Project.findOne({ id: projectId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get user (optional when auth is disabled)
    const user = project.userId ? await User.findOne({ id: project.userId }) : null;

    // Generate code using AI
    const result = await generateCode(
      requirements,
      project.settings,
      {
        existingFiles: project.files || [],
        conversationHistory: context?.conversationHistory,
      },
      selectedModel
    );

    // Save generated files to project
    const timestamp = new Date();

    // Add or update files in project
    result.files.forEach((file) => {
      const existingFileIndex = project.files.findIndex(
        (f: any) => f.path === file.path
      );

      // Generate hash for file content
      const hash = crypto
        .createHash('sha256')
        .update(file.content)
        .digest('hex');

      const fileData = {
        path: file.path,
        content: file.content,
        language: file.language,
        size: Buffer.byteLength(file.content, 'utf8'),
        createdBy: 'ai' as const,
        hash,
        version: existingFileIndex >= 0 ? (project.files[existingFileIndex].version || 0) + 1 : 1,
        createdAt: existingFileIndex >= 0 ? project.files[existingFileIndex].createdAt : timestamp,
        updatedAt: timestamp,
      };

      if (existingFileIndex >= 0) {
        // Update existing file
        project.files[existingFileIndex] = fileData;
      } else {
        // Add new file
        project.files.push(fileData);
      }
    });

    // Update project stats
    project.stats = {
      totalFiles: project.files.length,
      totalLines: project.files.reduce((sum: number, file: any) => {
        return sum + (file.content?.split('\n').length || 0);
      }, 0),
      totalSize: project.files.reduce((sum: number, file: any) => {
        return sum + (file.size || 0);
      }, 0),
    };

    project.updatedAt = timestamp;

    await project.save();

    // Update user token usage (approximate)
    if (user) {
      const estimatedTokens = requirements.length / 4 + result.files.reduce(
        (sum, file) => sum + file.content.length / 4,
        0
      );
      user.usage.tokensUsed += Math.ceil(estimatedTokens);
      await user.save();
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          files: result.files.map((f) => ({
            path: f.path,
            language: f.language,
            size: Buffer.byteLength(f.content, 'utf8'),
          })),
          explanation: result.explanation,
          suggestions: result.suggestions,
          stats: project.stats,
        },
        message: `Successfully generated ${result.files.length} file(s)`,
      },
      { status: 200 }
    );
  } catch (error) {
    secureError('Error generating code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
