import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import {
  generateSecurityFixes,
  applySecurityFixes,
  generateFixSummaryReport,
} from '@/lib/ai/agents/security-fix-agent';
import { SecurityVulnerability } from '@/lib/ai/agents/security-scan-agent';
import crypto from 'crypto';

// POST /api/projects/:id/security/fix - Auto-fix security vulnerabilities
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
    const { vulnerabilities, applyFixes = false } = body;

    if (!vulnerabilities || !Array.isArray(vulnerabilities)) {
      return NextResponse.json(
        { error: 'Vulnerabilities array is required' },
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

    if (!project.files || project.files.length === 0) {
      return NextResponse.json(
        { error: 'No files in project' },
        { status: 400 }
      );
    }

    // Prepare files
    const files = project.files.map((file: any) => ({
      path: file.path,
      content: file.content,
      language: file.language,
    }));

    // Generate fixes
    const fixResult = await generateSecurityFixes(vulnerabilities, files);

    if (fixResult.fixes.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          fixResult,
          appliedFixes: [],
          message: 'No fixes could be generated automatically',
        },
      });
    }

    // Apply fixes if requested
    let appliedFixes: Array<{ path: string; content: string; changes: string[] }> = [];

    if (applyFixes) {
      appliedFixes = await applySecurityFixes(files, fixResult.fixes);

      // Update project files with fixed code
      for (const fixedFile of appliedFixes) {
        const projectFile = project.files.find((f: any) => f.path === fixedFile.path);
        if (projectFile) {
          projectFile.content = fixedFile.content;
          projectFile.size = Buffer.from(fixedFile.content).length;
          projectFile.hash = crypto
            .createHash('sha256')
            .update(fixedFile.content)
            .digest('hex');
          projectFile.version += 1;
          projectFile.updatedAt = new Date();
        }
      }

      project.updateStats();
      await project.save();
    }

    // Generate report
    const report = generateFixSummaryReport(
      project.name,
      fixResult,
      appliedFixes
    );

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        projectName: project.name,
        fixResult,
        appliedFixes: appliedFixes.map((f) => ({
          path: f.path,
          changes: f.changes,
        })),
        report,
        fixedAt: new Date().toISOString(),
      },
      message: applyFixes
        ? `Applied ${appliedFixes.length} security fix(es) to ${appliedFixes.length} file(s)`
        : `Generated ${fixResult.fixes.length} security fix(es)`,
    });
  } catch (error: any) {
    secureError('Error fixing security vulnerabilities:', error);
    return NextResponse.json(
      {
        error: 'Failed to fix security vulnerabilities',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
