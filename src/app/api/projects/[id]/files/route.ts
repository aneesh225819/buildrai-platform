import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import crypto from 'crypto';

// GET /api/projects/:id/files - List project files
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

    const project = await Project.findOne({ id: projectId, userId }).select(
      'files'
    );

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project.files,
    });
  } catch (error) {
    secureError('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:id/files - Create or update file
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
    const { path, content, language, createdBy = 'user' } = body;

    if (!path || !content || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check if file exists
    const existingFileIndex = project.files.findIndex(
      (f: any) => f.path === path
    );

    const fileData = {
      path,
      content,
      language,
      size: Buffer.byteLength(content, 'utf8'),
      createdBy,
      hash: crypto.createHash('sha256').update(content).digest('hex'),
      updatedAt: new Date(),
    };

    if (existingFileIndex >= 0) {
      // Update existing file
      project.files[existingFileIndex] = {
        ...project.files[existingFileIndex],
        ...fileData,
        version: (project.files[existingFileIndex].version || 1) + 1,
      };
    } else {
      // Add new file
      project.files.push({
        ...fileData,
        version: 1,
        createdAt: new Date(),
      });
    }

    // Update project stats
    project.updateStats();

    await project.save();

    return NextResponse.json({
      success: true,
      data: {
        path,
        version:
          existingFileIndex >= 0
            ? project.files[existingFileIndex].version
            : 1,
      },
    });
  } catch (error) {
    secureError('Error saving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/files - Delete multiple files
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

    const { id } = await params;
    const body = await req.json();
    const { filePaths } = body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid filePaths array' },
        { status: 400 }
      );
    }

    // Get project
    const project = await Project.findOne({ id, userId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Filter out the files to delete
    const originalFileCount = project.files.length;
    project.files = project.files.filter(
      (file: any) => !filePaths.includes(file.path)
    );

    const deletedCount = originalFileCount - project.files.length;

    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'No matching files found to delete' },
        { status: 404 }
      );
    }

    // Update project stats
    project.updateStats();
    project.updatedAt = new Date();

    await project.save();

    return NextResponse.json(
      {
        success: true,
        message: `Successfully deleted ${deletedCount} file(s)`,
        data: {
          deletedCount,
          stats: project.stats,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    secureError('Error deleting files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/files - Rename, Copy, or Move files
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { operation, oldPath, newPath, filePaths } = body;

    // Get project
    const project = await Project.findOne({ id, userId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Handle different operations
    if (operation === 'rename') {
      if (!oldPath || !newPath) {
        return NextResponse.json(
          { error: 'Missing oldPath or newPath' },
          { status: 400 }
        );
      }

      if (oldPath === newPath) {
        return NextResponse.json(
          { error: 'New path must be different from old path' },
          { status: 400 }
        );
      }

      const fileIndex = project.files.findIndex(
        (file: any) => file.path === oldPath
      );

      if (fileIndex === -1) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      const newPathExists = project.files.some(
        (file: any) => file.path === newPath
      );

      if (newPathExists) {
        return NextResponse.json(
          { error: 'A file with the new path already exists' },
          { status: 409 }
        );
      }

      project.files[fileIndex].path = newPath;
      project.files[fileIndex].updatedAt = new Date();

      project.updatedAt = new Date();
      await project.save();

      return NextResponse.json(
        {
          success: true,
          message: 'File renamed successfully',
          data: {
            oldPath,
            newPath,
          },
        },
        { status: 200 }
      );
    } else if (operation === 'copy') {
      if (!filePaths || !newPath) {
        return NextResponse.json(
          { error: 'Missing filePaths or newPath' },
          { status: 400 }
        );
      }

      const copiedFiles: any[] = [];
      const timestamp = new Date();

      for (const filePath of filePaths) {
        const fileIndex = project.files.findIndex(
          (f: any) => f.path === filePath
        );

        if (fileIndex === -1) continue;

        const originalFile = project.files[fileIndex];
        const fileName = filePath.split('/').pop();
        const newFilePath = `${newPath}/${fileName}`;

        // Check if destination already exists
        const exists = project.files.some((f: any) => f.path === newFilePath);
        if (exists) continue;

        const copiedFile = {
          path: newFilePath,
          content: originalFile.content,
          language: originalFile.language,
          size: originalFile.size,
          createdBy: originalFile.createdBy,
          hash: originalFile.hash,
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        project.files.push(copiedFile);
        copiedFiles.push({ oldPath: filePath, newPath: newFilePath });
      }

      project.updateStats();
      project.updatedAt = timestamp;
      await project.save();

      return NextResponse.json(
        {
          success: true,
          message: `Successfully copied ${copiedFiles.length} file(s)`,
          data: { copiedFiles, stats: project.stats },
        },
        { status: 200 }
      );
    } else if (operation === 'move') {
      if (!filePaths || !newPath) {
        return NextResponse.json(
          { error: 'Missing filePaths or newPath' },
          { status: 400 }
        );
      }

      const movedFiles: any[] = [];
      const timestamp = new Date();

      for (const filePath of filePaths) {
        const fileIndex = project.files.findIndex(
          (f: any) => f.path === filePath
        );

        if (fileIndex === -1) continue;

        const fileName = filePath.split('/').pop();
        const newFilePath = `${newPath}/${fileName}`;

        // Check if destination already exists
        const exists = project.files.some((f: any) => f.path === newFilePath);
        if (exists) continue;

        project.files[fileIndex].path = newFilePath;
        project.files[fileIndex].updatedAt = timestamp;
        movedFiles.push({ oldPath: filePath, newPath: newFilePath });
      }

      project.updatedAt = timestamp;
      await project.save();

      return NextResponse.json(
        {
          success: true,
          message: `Successfully moved ${movedFiles.length} file(s)`,
          data: { movedFiles },
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid operation. Use rename, copy, or move' },
        { status: 400 }
      );
    }
  } catch (error) {
    secureError('Error in file operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
