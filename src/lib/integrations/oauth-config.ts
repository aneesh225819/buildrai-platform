/**
 * OAuth Configuration for Data Source Integrations
 *
 * This file contains OAuth 2.0 configuration for GitHub, Bitbucket, and Azure Repos.
 * Each integration uses the Authorization Code Flow with PKCE for enhanced security.
 */

import crypto from 'crypto';

export interface OAuthProvider {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * GitHub OAuth Configuration
 * Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */
export const githubOAuthConfig: OAuthProvider = {
  name: 'GitHub',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scopes: ['repo', 'read:user'], // repo for repository access, read:user for user info
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`,
};

/**
 * Bitbucket OAuth Configuration
 * Docs: https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/
 */
export const bitbucketOAuthConfig: OAuthProvider = {
  name: 'Bitbucket',
  authorizationUrl: 'https://bitbucket.org/site/oauth2/authorize',
  tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
  userInfoUrl: 'https://api.bitbucket.org/2.0/user',
  scopes: ['repository', 'account'], // repository for repo access, account for user info
  clientId: process.env.BITBUCKET_CLIENT_ID || '',
  clientSecret: process.env.BITBUCKET_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/bitbucket/callback`,
};

/**
 * Azure Repos (Azure DevOps) OAuth Configuration
 * Docs: https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth
 */
export const azureOAuthConfig: OAuthProvider = {
  name: 'Azure Repos',
  authorizationUrl: 'https://app.vssps.visualstudio.com/oauth2/authorize',
  tokenUrl: 'https://app.vssps.visualstudio.com/oauth2/token',
  userInfoUrl: 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me',
  scopes: ['vso.code', 'vso.profile'], // vso.code for repo access, vso.profile for user info
  clientId: process.env.AZURE_CLIENT_ID || '',
  clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/azure/callback`,
};

/**
 * Get OAuth configuration by provider name
 */
export function getOAuthConfig(provider: 'github' | 'bitbucket' | 'azure'): OAuthProvider {
  switch (provider) {
    case 'github':
      return githubOAuthConfig;
    case 'bitbucket':
      return bitbucketOAuthConfig;
    case 'azure':
      return azureOAuthConfig;
    default:
      throw new Error(`Unknown OAuth provider: ${provider}`);
  }
}

/**
 * Generate OAuth authorization URL with PKCE
 */
export function generateAuthorizationUrl(
  provider: 'github' | 'bitbucket' | 'azure',
  state: string,
  codeVerifier?: string
): string {
  const config = getOAuthConfig(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state, // CSRF protection
    response_type: 'code',
  });

  // Add PKCE code_challenge if code_verifier is provided
  if (codeVerifier) {
    const codeChallenge = generateCodeChallenge(codeVerifier);
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Generate PKCE code verifier (random string)
 * Uses Node.js crypto for server-side generation
 */
export function generateCodeVerifier(): string {
  const buffer = crypto.randomBytes(32);
  return base64UrlEncode(buffer);
}

/**
 * Generate PKCE code challenge from verifier
 * Uses Node.js crypto for server-side hashing
 */
function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

/**
 * Base64 URL encode
 * Uses Node.js Buffer for server-side encoding
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
