import { SecurityDashboard } from '@/components/project/security-dashboard';

export default async function ProjectSecurityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  return (
    <div className="container mx-auto py-8">
      <SecurityDashboard projectId={projectId} />
    </div>
  );
}
