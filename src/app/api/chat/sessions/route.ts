import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { ChatSession } from '@/lib/db/models';

// GET /api/chat/sessions - List chat sessions
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') || 'active';

    const query: any = { userId, status };

    if (projectId) {
      query.projectId = projectId;
    }

    const sessions = await ChatSession.find(query)
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    secureError('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/chat/sessions - Create new chat session
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { projectId, type } = body;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const session = await ChatSession.create({
      id: sessionId,
      userId,
      projectId: projectId || null,
      title: 'New Chat',
      type: type || 'general',
      messages: [],
      status: 'active',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId: session.id,
          type: session.type,
          createdAt: session.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    secureError('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
