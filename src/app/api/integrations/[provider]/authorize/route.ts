/**
 * OAuth Authorization Endpoint
 *
 * Initiates the OAuth flow by redirecting the user to the provider's authorization page.
 *
 * GET /api/integrations/[provider]/authorize
 */

// Authentication disabled for testing (same as other routes)
// import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthorizationUrl } from '@/lib/integrations/oauth-config';
import connectDB from '@/lib/db/mongodb';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    // Authentication disabled for testing
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // For testing, use a mock user ID
    const userId = 'test-user-id';

    const params = await context.params;
    const { provider } = params;

    // Validate provider
    if (!['github', 'bitbucket', 'azure'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    await connectDB();

    // Generate state for CSRF protection
    // Store user ID in state for callback verification
    const stateData = {
      userId,
      timestamp: Date.now(),
    };

    // Encode state data
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Generate authorization URL (without PKCE for now)
    const authUrl = generateAuthorizationUrl(
      provider as 'github' | 'bitbucket' | 'azure',
      encodedState
    );

    // Redirect to provider's authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
