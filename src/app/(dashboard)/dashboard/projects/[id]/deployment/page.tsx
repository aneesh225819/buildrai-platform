import { DeploymentDashboard } from '@/components/project/deployment-dashboard';

export default async function ProjectDeploymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  return (
    <div className="container mx-auto py-8">
      <DeploymentDashboard projectId={projectId} />
    </div>
  );
}
