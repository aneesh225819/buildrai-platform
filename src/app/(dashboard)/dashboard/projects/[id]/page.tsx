// Authentication disabled for testing
// import { auth } from '@clerk/nextjs/server';
// import { redirect } from 'next/navigation';
import { ProjectWorkspace } from '@/components/project/project-workspace';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // const { userId } = await auth();

  // if (!userId) {
  //   redirect('/sign-in');
  // }

  const { id } = await params;

  return <ProjectWorkspace projectId={id} />;
}
