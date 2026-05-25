// Temporary mock auth for testing without Clerk
// This bypasses authentication to allow testing of platform features

export async function auth() {
  return {
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    orgId: null,
    orgRole: null,
    orgSlug: null,
  };
}
