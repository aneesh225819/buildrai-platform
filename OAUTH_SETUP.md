# OAuth Setup Guide for Repository Integrations

This guide explains how to set up OAuth applications for GitHub, Bitbucket, and Azure Repos to enable secure repository connections.

## Security Overview

Our platform uses **OAuth 2.0 Authorization Code Flow with PKCE** for secure repository access:

1. **No Password Sharing**: Users authenticate directly with the provider
2. **Encrypted Token Storage**: Access tokens are encrypted using AES-256-GCM before storage
3. **Minimal Permissions**: We only request read-only repository access
4. **User Control**: Users can revoke access anytime from their provider settings
5. **Token Expiration**: Tokens automatically expire and can be refreshed

## Prerequisites

Before setting up OAuth, generate a strong encryption key for token storage:

```bash
# Generate a secure encryption key
openssl rand -base64 32

# Add it to your .env file
echo "TOKEN_ENCRYPTION_KEY=<generated-key>" >> .env
```

---

## GitHub OAuth Setup

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: BuildRAI Platform (or your app name)
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `http://localhost:3000/api/integrations/github/callback`
   - **Enable Device Flow**: No (leave unchecked)
4. Click "Register application"

### 2. Get Your Credentials

After registration, you'll see:
- **Client ID**: Copy this value
- **Client Secret**: Click "Generate a new client secret" and copy it immediately

### 3. Add to Environment Variables

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

### 4. Scopes Requested

We request the following scopes:
- `repo`: Full access to repositories (for reading code)
- `read:user`: Read user profile information

---

## Bitbucket OAuth Setup

### 1. Create a Bitbucket OAuth Consumer

1. Go to [Bitbucket OAuth Settings](https://bitbucket.org/account/settings/app-passwords/)
2. Click "Add OAuth consumer"
3. Fill in the details:
   - **Name**: BuildRAI Platform
   - **Callback URL**: `http://localhost:3000/api/integrations/bitbucket/callback`
   - **This is a private consumer**: Check this box
   - **Permissions**:
     - Account: Read
     - Repositories: Read

4. Click "Save"

### 2. Get Your Credentials

After creation:
- **Key**: This is your Client ID
- **Secret**: This is your Client Secret

### 3. Add to Environment Variables

```bash
BITBUCKET_CLIENT_ID=your_key_here
BITBUCKET_CLIENT_SECRET=your_secret_here
```

### 4. Scopes Requested

We request the following scopes:
- `repository`: Read repository content
- `account`: Read account information

---

## Azure Repos OAuth Setup

### 1. Register an Application

1. Go to [Azure DevOps App Registration](https://app.vsaex.visualstudio.com/app/register)
2. Fill in the details:
   - **Company name**: Your company name
   - **Application name**: BuildRAI Platform
   - **Application website**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/integrations/azure/callback`
   - **Authorized scopes**:
     - Code (read)
     - User profile (read)

3. Click "Create Application"

### 2. Get Your Credentials

After registration:
- **App ID**: This is your Client ID
- **Client Secret**: Generate one if not shown automatically

### 3. Add to Environment Variables

```bash
AZURE_CLIENT_ID=your_app_id_here
AZURE_CLIENT_SECRET=your_client_secret_here
```

### 4. Scopes Requested

We request the following scopes:
- `vso.code`: Read source code
- `vso.profile`: Read user profile

---

## Production Setup

### For Production Deployment:

1. **Update Callback URLs**: Change all callback URLs from `localhost:3000` to your production domain
2. **Use HTTPS**: Ensure your production app uses HTTPS
3. **Secure Environment Variables**: Use a secrets manager (e.g., AWS Secrets Manager, Vercel Environment Variables)
4. **Rotate Keys Regularly**: Set up a process to rotate OAuth credentials periodically
5. **Monitor Token Usage**: Implement logging for OAuth token usage and failures

### Environment Variable Checklist:

```bash
# Required for all environments
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
TOKEN_ENCRYPTION_KEY=<strong-random-key>

# At least one OAuth provider
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Optional: Additional providers
BITBUCKET_CLIENT_ID=...
BITBUCKET_CLIENT_SECRET=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
```

---

## Testing the Integration

### 1. Start Your Development Server

```bash
npm run dev
```

### 2. Test the OAuth Flow

1. Navigate to `http://localhost:3000/dashboard/new`
2. Select "Data Source" as project type
3. Choose a provider (GitHub, Bitbucket, or Azure)
4. Click "Connect to [Provider]"
5. You'll be redirected to the provider's authorization page
6. Authorize the application
7. You'll be redirected back with your repositories listed

### 3. Verify Token Storage

Check your MongoDB database for the `integrations` collection. You should see:
- Encrypted access token
- User information
- Last used timestamp

### 4. Test Repository Fetching

After connection, the UI should display:
- List of your repositories
- Branch selection after choosing a repository

---

## Security Best Practices

1. **Never Commit Secrets**: Add `.env` to `.gitignore`
2. **Use Different Keys**: Use separate OAuth apps for development and production
3. **Implement Rate Limiting**: Add rate limits to OAuth endpoints
4. **Log Security Events**: Log all OAuth authorization attempts
5. **Regular Audits**: Periodically review connected integrations
6. **User Notifications**: Notify users when new integrations are added

---

## Troubleshooting

### "Integration not found" Error
- Ensure the user has connected their account first
- Check that the OAuth callback completed successfully

### "Failed to fetch repositories" Error
- Verify OAuth credentials are correct
- Check that scopes are properly configured
- Ensure access token hasn't expired

### "Token encryption failed" Error
- Verify `TOKEN_ENCRYPTION_KEY` is set in environment variables
- Ensure the key is at least 32 characters long

### OAuth Redirect Not Working
- Verify callback URLs match exactly (including protocol and port)
- Check that the OAuth app is active on the provider's side
- Ensure no trailing slashes in callback URLs

---

## Support

For more information:
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- [Bitbucket OAuth Documentation](https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/)
- [Azure DevOps OAuth Documentation](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth)
