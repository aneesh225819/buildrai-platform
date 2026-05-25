import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import { User } from '@/lib/db/models';

// GET /api/projects - List all user projects
export async function GET(req: NextRequest) {
  try {
    // Authentication disabled for testing
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const userId = 'test-user'; // Mock user ID for testing

    await connectDB();

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || '-createdAt';

    // Build query
    const query: any = {}; // Don't filter by userId for testing

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      Project.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-files') // Exclude files for list view
        .lean(),
      Project.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    secureError('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    // Authentication disabled for testing
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const userId = 'test-user'; // Mock user ID for testing

    await connectDB();

    // Skip user limits check for testing
    // let user = await User.findOne({ id: userId });
    // if (!user) {
    //   user = await User.create({
    //     id: userId,
    //     email: '',
    //     username: userId.split('_')[1] || userId,
    //     profile: { firstName: '', lastName: '', avatar: '' },
    //     subscription: { plan: 'free', status: 'active' },
    //     usage: {
    //       projectsCreated: 0,
    //       projectsThisMonth: 0,
    //       tokensUsed: 0,
    //       deploymentsUsed: 0,
    //       lastResetDate: new Date(),
    //     },
    //   });
    // }
    // await user.resetMonthlyUsage();
    // if (!user.canCreateProject()) {
    //   return NextResponse.json(
    //     {
    //       error: 'Project limit reached',
    //       message: `You've reached your monthly limit. Upgrade to create more projects.`,
    //     },
    //     { status: 403 }
    //   );
    // }

    const body = await req.json();
    const { name, description, settings } = body;

    // Validate required fields
    if (!name || !settings?.template || !settings?.framework) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existingProject = await Project.findOne({ userId, slug });

    if (existingProject) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }

    // Create project
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const project = await Project.create({
      id: projectId,
      userId,
      name,
      description: description || '',
      slug,
      settings: {
        template: settings.template,
        language: settings.language || 'typescript',
        framework: settings.framework,
        packageManager: settings.packageManager || 'npm',
        styling: settings.styling || 'tailwind',
      },
      files: [],
      status: 'draft',
      stats: {
        totalFiles: 0,
        totalLines: 0,
        totalSize: 0,
      },
    });

    // Skip user usage update for testing
    // user.usage.projectsCreated += 1;
    // user.usage.projectsThisMonth += 1;
    // await user.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          status: project.status,
          createdAt: project.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    secureError('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
