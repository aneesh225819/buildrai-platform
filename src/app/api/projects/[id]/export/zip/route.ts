import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import JSZip from 'jszip';
import { uploadProjectExport } from '@/lib/aws/s3';

// POST /api/projects/:id/export/zip - Export project as ZIP
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

    // Create ZIP file
    const zip = new JSZip();

    // Add all files to ZIP
    project.files.forEach((file: any) => {
      zip.file(file.path, file.content);
    });

    // Add README if not exists
    const hasReadme = project.files.some((f: any) =>
      f.path.toLowerCase().includes('readme')
    );

    if (!hasReadme) {
      zip.file(
        'README.md',
        `# ${project.name}\n\n${project.description || 'No description'}\n\n## Tech Stack\n\n- Framework: ${project.settings.framework}\n- Language: ${project.settings.language}\n- Styling: ${project.settings.styling}\n\n## Getting Started\n\nInstall dependencies:\n\n\`\`\`bash\n${project.settings.packageManager} install\n\`\`\`\n\nRun development server:\n\n\`\`\`bash\n${project.settings.packageManager} run dev\n\`\`\`\n\n---\n\nGenerated with BuildrAI\n`
      );
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    // Try to upload to S3 (optional)
    let s3Url: string | null = null;

    try {
      const { url } = await uploadProjectExport(projectId, zipBuffer);
      s3Url = url;
    } catch (s3Error) {
      secureError('Failed to upload to S3, returning direct download:', s3Error);
    }

    if (s3Url) {
      // Return S3 URL
      return NextResponse.json({
        success: true,
        data: {
          downloadUrl: s3Url,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          size: zipBuffer.length,
        },
      });
    } else {
      // Return ZIP file directly
      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${project.slug || 'project'}.zip"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      });
    }
  } catch (error) {
    secureError('Error exporting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
