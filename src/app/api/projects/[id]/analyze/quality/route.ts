import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import { analyzeCodeQuality, generateCodeQualityReport } from '@/lib/ai/agents/code-quality-agent';

// POST /api/projects/:id/analyze/quality - Analyze code quality
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

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.files || project.files.length === 0) {
      return NextResponse.json(
        { error: 'No files to analyze' },
        { status: 400 }
      );
    }

    // Prepare files for analysis
    const files = project.files.map((file: any) => ({
      path: file.path,
      content: file.content,
      language: file.language,
    }));

    // Run code quality analysis
    const analysis = await analyzeCodeQuality(
      files,
      project.settings?.framework
    );

    // Generate report
    const report = await generateCodeQualityReport(
      projectId,
      project.name,
      analysis,
      files.length
    );

    // Store analysis results in project (you can extend the Project model to include this)
    // For now, we'll just return the results

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        projectName: project.name,
        analysis,
        report,
        analyzedAt: new Date().toISOString(),
      },
      message: 'Code quality analysis completed successfully',
    });
  } catch (error: any) {
    secureError('Error analyzing code quality:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze code quality',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
