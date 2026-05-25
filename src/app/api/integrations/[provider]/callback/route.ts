/**
 * OAuth Callback Endpoint
 *
 * Handles the callback from OAuth providers after user authorization.
 * Exchanges the authorization code for an access token and stores it securely.
 *
 * GET /api/integrations/[provider]/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOAuthConfig } from '@/lib/integrations/oauth-config';
import { encryptToken } from '@/lib/integrations/token-encryption';
import connectDB from '@/lib/db/mongodb';
import { Integration } from '@/lib/db/models/integration';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope: string;
}

interface UserInfo {
  id: string;
  login?: string;
  username?: string;
  email?: string;
  displayName?: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const params = await context.params;
    const { provider } = params;
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?error=missing_parameters`
      );
    }

    // Validate provider
    if (!['github', 'bitbucket', 'azure'].includes(provider)) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?error=invalid_provider`
      );
    }

    // Decode and verify state
    const stateData = JSON.parse(
      Buffer.from(stateParam, 'base64url').toString('utf-8')
    );

    const { userId, timestamp } = stateData;

    // Verify state hasn't expired (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?error=state_expired`
      );
    }

    const config = getOAuthConfig(provider as 'github' | 'bitbucket' | 'azure');

    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?error=token_exchange_failed`
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    // Fetch user info from provider
    const userInfoResponse = await fetch(config.userInfoUrl, {
      headers: {
        'Authorization': `${tokenData.token_type} ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?error=user_info_failed`
      );
    }

    const userInfo: UserInfo = await userInfoResponse.json();

    // Connect to database
    await connectDB();

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? encryptToken(tokenData.refresh_token)
      : undefined;

    // Calculate expiration date
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    // Store or update integration
    await Integration.findOneAndUpdate(
      { userId, provider: provider as 'github' | 'bitbucket' | 'azure' },
      {
        userId,
        provider: provider as 'github' | 'bitbucket' | 'azure',
        providerUserId: userInfo.id,
        providerUsername: userInfo.login || userInfo.username || userInfo.displayName || 'unknown',
        providerEmail: userInfo.email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: tokenData.token_type,
        expiresAt,
        scopes: tokenData.scope?.split(' ') || config.scopes,
        isActive: true,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Redirect back to project creation page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?provider=${provider}&connected=true`
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/new?error=callback_failed`
    );
  }
}
