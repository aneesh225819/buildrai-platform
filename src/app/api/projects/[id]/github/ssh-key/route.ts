import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { GitHubService } from '@/lib/github/github-service';
import { secureError, auditLog } from '@/lib/security/logger';

// POST /api/projects/:id/github/ssh-key - Generate SSH key pair
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const githubService = new GitHubService();
    const keyPair = await githubService.generateSSHKey();

    // Audit log for SSH key generation
    auditLog(userId, 'SSH_KEY_GENERATED', `project:${projectId}`, {
      fingerprint: keyPair.fingerprint,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        fingerprint: keyPair.fingerprint,
        createdAt: keyPair.createdAt,
      },
      message: 'SSH key pair generated successfully',
      instructions: {
        steps: [
          '1. Copy the public key above',
          '2. Go to GitHub Settings → SSH and GPG keys',
          '3. Click "New SSH key"',
          '4. Paste the public key and give it a title',
          '5. Save the key',
          '6. Use the private key to connect your project',
        ],
        note: 'Keep your private key secure. Never share it with anyone.',
      },
    });
  } catch (error: any) {
    secureError('Error generating SSH key', error);
    return NextResponse.json(
      {
        error: 'Failed to generate SSH key',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
