import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import {
  generateTests,
  generateTestingSummaryReport,
} from '@/lib/ai/agents/test-generation-agent';
import crypto from 'crypto';

// POST /api/projects/:id/generate/tests - Generate tests for project
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
    const { testingFramework } = body;

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.files || project.files.length === 0) {
      return NextResponse.json(
        { error: 'No files to generate tests for' },
        { status: 400 }
      );
    }

    // Prepare files for test generation
    const files = project.files.map((file: any) => ({
      path: file.path,
      content: file.content,
      language: file.language,
    }));

    // Generate tests
    const result = await generateTests(
      files,
      project.settings?.framework,
      testingFramework
    );

    // Generate report
    const report = generateTestingSummaryReport(project.name, result);

    // Add generated test files to project
    const newTestFiles = result.testFiles.map((testFile) => ({
      path: testFile.path,
      content: testFile.content,
      language: project.settings.language || 'typescript',
      size: Buffer.from(testFile.content).length,
      createdBy: 'ai' as const,
      version: 1,
      hash: crypto.createHash('sha256').update(testFile.content).digest('hex'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Add test files to project
    project.files.push(...newTestFiles);
    project.updateStats();
    await project.save();

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        projectName: project.name,
        result,
        report,
        testsAdded: newTestFiles.length,
        generatedAt: new Date().toISOString(),
      },
      message: `Generated ${result.summary.totalTests} tests across ${result.summary.totalTestFiles} files`,
    });
  } catch (error: any) {
    secureError('Error generating tests:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate tests',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
