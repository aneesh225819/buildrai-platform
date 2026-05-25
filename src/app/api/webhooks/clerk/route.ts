import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    secureError('Error verifying webhook:', err);
    return new NextResponse('Error occurred', {
      status: 400,
    });
  }

  // Connect to database
  await connectDB();

  const eventType = evt.type;

  // Handle the webhook
  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      default:
        console.log(`Unhandled webhook type: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    secureError('Error handling webhook:', error);
    return new NextResponse('Error occurred', { status: 500 });
  }
}

async function handleUserCreated(data: any) {
  const { id, email_addresses, username, first_name, last_name, image_url } =
    data;

  const primaryEmail = email_addresses.find(
    (email: any) => email.id === data.primary_email_address_id
  );

  await User.create({
    id,
    email: primaryEmail?.email_address || '',
    username: username || email_addresses[0]?.email_address.split('@')[0],
    profile: {
      firstName: first_name || '',
      lastName: last_name || '',
      avatar: image_url || '',
    },
    subscription: {
      plan: 'free',
      status: 'active',
    },
    usage: {
      projectsCreated: 0,
      projectsThisMonth: 0,
      tokensUsed: 0,
      deploymentsUsed: 0,
      lastResetDate: new Date(),
    },
  });

  console.log(`✅ User created: ${id}`);
}

async function handleUserUpdated(data: any) {
  const { id, email_addresses, username, first_name, last_name, image_url } =
    data;

  const primaryEmail = email_addresses.find(
    (email: any) => email.id === data.primary_email_address_id
  );

  await User.findOneAndUpdate(
    { id },
    {
      email: primaryEmail?.email_address,
      username: username || email_addresses[0]?.email_address.split('@')[0],
      'profile.firstName': first_name,
      'profile.lastName': last_name,
      'profile.avatar': image_url,
    }
  );

  console.log(`✅ User updated: ${id}`);
}

async function handleUserDeleted(data: any) {
  const { id } = data;

  await User.findOneAndDelete({ id });

  console.log(`✅ User deleted: ${id}`);
}
