import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { ChatSession, User } from '@/lib/db/models';
import {
  createStreamingChatCompletion,
  estimateTokens,
  calculateCost,
  DEFAULT_MODEL,
} from '@/lib/ai/anthropic';

// POST /api/chat/sessions/:id/messages - Send message with streaming
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    await connectDB();

    const { id: sessionId } = await params;
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Get session
    const session = await ChatSession.findOne({
      id: sessionId,
      userId,
    });

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    // Get user for tracking
    const user = await User.findOne({ id: userId });

    // Add user message
    session.messages.push({
      role: 'user',
      content: message,
      createdAt: new Date(),
    });

    // Prepare messages for API
    const apiMessages = session.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        const startTime = Date.now();

        try {
          // Send start event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'start', messageId: sessionId })}\n\n`
            )
          );

          // Stream the response
          for await (const chunk of createStreamingChatCompletion(
            apiMessages,
            {
              model: DEFAULT_MODEL,
              system:
                session.type === 'requirements'
                  ? 'You are a requirements gathering agent. Help users define their project requirements clearly.'
                  : 'You are a helpful AI assistant for software development.',
            }
          )) {
            fullResponse += chunk;

            // Send content delta
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'content', delta: chunk })}\n\n`
              )
            );
          }

          // Calculate metadata
          const responseTime = Date.now() - startTime;
          const inputTokens = estimateTokens(message);
          const outputTokens = estimateTokens(fullResponse);
          const cost = calculateCost(DEFAULT_MODEL, inputTokens, outputTokens);

          // Save assistant message
          session.messages.push({
            role: 'assistant',
            content: fullResponse,
            metadata: {
              tokenCount: outputTokens,
              model: DEFAULT_MODEL,
              responseTime,
              cost,
            },
            createdAt: new Date(),
          });

          await session.save();

          // Update user token usage
          if (user) {
            user.usage.tokensUsed += inputTokens + outputTokens;
            await user.save();
          }

          // Send end event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'end',
                messageId: sessionId,
                metadata: {
                  tokens: outputTokens,
                  cost,
                  responseTime,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          secureError('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: 'An error occurred while processing your request',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    secureError('Error in chat message:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
