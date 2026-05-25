// Authentication disabled for testing
// import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';

// GET /api/projects/:id - Get project details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // const { userId } = await auth();

    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectDB();

    const { id } = await params;

    const project = await Project.findOne({ id }).lean(); // Don't filter by userId for testing

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    secureError('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/:id - Update project
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // const { userId } = await auth();

    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const project = await Project.findOne({ id }); // Don't filter by userId for testing

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (body.name) {
      project.name = body.name;
      // Update slug if name changes
      project.slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    if (body.description !== undefined) {
      project.description = body.description;
    }

    if (body.settings) {
      project.settings = { ...project.settings, ...body.settings };
    }

    if (body.requirements) {
      project.requirements = body.requirements;
    }

    if (body.status) {
      project.status = body.status;
    }

    await project.save();

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    secureError('Error updating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - Delete project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // const { userId } = await auth();

    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectDB();

    const { id } = await params;

    const project = await Project.findOne({ id }); // Don't filter by userId for testing

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Soft delete by updating status
    project.status = 'deleted';
    await project.save();

    // TODO: Delete files from S3 in background job

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    secureError('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
