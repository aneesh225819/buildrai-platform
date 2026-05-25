import { CodeQualityDashboard } from '@/components/project/code-quality-dashboard';

export default async function ProjectQualityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  return (
    <div className="container mx-auto py-8">
      <CodeQualityDashboard projectId={projectId} />
    </div>
  );
}
