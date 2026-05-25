import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import {
  performSecurityScan,
  scanDependencies,
  generateSecurityReport,
} from '@/lib/ai/agents/security-scan-agent';

// POST /api/projects/:id/security/scan - Perform security scan
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
        { error: 'No files to scan' },
        { status: 400 }
      );
    }

    // Prepare files for security scanning
    const files = project.files.map((file: any) => ({
      path: file.path,
      content: file.content,
      language: file.language,
    }));

    // Find package.json for dependency scanning
    const packageJsonFile = project.files.find(
      (f: any) => f.path === 'package.json' || f.path.endsWith('/package.json')
    );

    const lockFile = project.files.find(
      (f: any) =>
        f.path === 'package-lock.json' ||
        f.path === 'yarn.lock' ||
        f.path === 'pnpm-lock.yaml'
    );

    // Run security scan
    const scanResult = await performSecurityScan(
      files,
      project.settings?.framework
    );

    // Scan dependencies if package.json exists
    let dependencyVulns = null;
    if (packageJsonFile) {
      try {
        dependencyVulns = await scanDependencies(
          packageJsonFile.content,
          lockFile?.content
        );
      } catch (error) {
        secureError('Dependency scan failed:', error);
        // Continue even if dependency scan fails
      }
    }

    // Generate comprehensive security report
    const report = generateSecurityReport(
      projectId,
      project.name,
      scanResult,
      dependencyVulns
    );

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        projectName: project.name,
        scanResult,
        dependencyVulnerabilities: dependencyVulns,
        report,
        scannedAt: new Date().toISOString(),
      },
      message: `Security scan completed. Found ${scanResult.summary.totalVulnerabilities} vulnerabilities and ${scanResult.summary.secretsFound} secrets.`,
    });
  } catch (error: any) {
    secureError('Error performing security scan:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform security scan',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
