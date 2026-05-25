'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Cloud,
  Rocket,
  Loader2,
  DollarSign,
  Server,
  Container,
  GitBranch,
  Activity,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface DeploymentDashboardProps {
  projectId: string;
}

export function DeploymentDashboard({ projectId }: DeploymentDashboardProps) {
  const [activeTab, setActiveTab] = useState('config');
  const [cloudProvider, setCloudProvider] = useState('aws');
  const [deploymentType, setDeploymentType] = useState('container');
  const [cicdPlatform, setCicdPlatform] = useState('github-actions');
  const [region, setRegion] = useState('us-east-1');

  const deploymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/deployment/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudProvider,
          deploymentType,
          cicdPlatform,
          region,
          scalingStrategy: 'auto',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate deployment config');
      }

      return res.json();
    },
  });

  const deploymentConfig = deploymentMutation.data?.data?.deploymentConfig;
  const costEstimate = deploymentConfig?.costEstimate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="h-6 w-6" />
            Deployment
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure and deploy your project to the cloud
          </p>
        </div>
        <Button
          onClick={() => deploymentMutation.mutate()}
          disabled={deploymentMutation.isPending}
          className="gap-2"
        >
          {deploymentMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Generate Deployment Config
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="cicd">CI/CD</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Configuration</CardTitle>
              <CardDescription>
                Choose your deployment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Cloud Provider */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cloud Provider</label>
                  <Select
                    value={cloudProvider}
                    onValueChange={(value) => value && setCloudProvider(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          Amazon Web Services (AWS)
                        </div>
                      </SelectItem>
                      <SelectItem value="azure">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          Microsoft Azure
                        </div>
                      </SelectItem>
                      <SelectItem value="gcp">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          Google Cloud Platform
                        </div>
                      </SelectItem>
                      <SelectItem value="multi-cloud">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          Multi-Cloud
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Deployment Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deployment Type</label>
                  <Select
                    value={deploymentType}
                    onValueChange={(value) => value && setDeploymentType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="container">
                        <div className="flex items-center gap-2">
                          <Container className="h-4 w-4" />
                          Container (Docker/K8s)
                        </div>
                      </SelectItem>
                      <SelectItem value="serverless">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Serverless (Lambda/Functions)
                        </div>
                      </SelectItem>
                      <SelectItem value="vm">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Virtual Machine (EC2/VM)
                        </div>
                      </SelectItem>
                      <SelectItem value="static">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Static Site (S3/CDN)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CI/CD Platform */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">CI/CD Platform</label>
                  <Select
                    value={cicdPlatform}
                    onValueChange={(value) => value && setCicdPlatform(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github-actions">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          GitHub Actions
                        </div>
                      </SelectItem>
                      <SelectItem value="gitlab-ci">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          GitLab CI/CD
                        </div>
                      </SelectItem>
                      <SelectItem value="jenkins">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Jenkins
                        </div>
                      </SelectItem>
                      <SelectItem value="circleci">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          CircleCI
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Region</label>
                  <Select
                    value={region}
                    onValueChange={(value) => value && setRegion(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                      <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                      <SelectItem value="ap-southeast-1">
                        Asia Pacific (Singapore)
                      </SelectItem>
                      <SelectItem value="ap-northeast-1">
                        Asia Pacific (Tokyo)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => deploymentMutation.mutate()}
                  disabled={deploymentMutation.isPending}
                  className="w-full gap-2"
                  size="lg"
                >
                  {deploymentMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating Configuration...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5" />
                      Generate Deployment Configuration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {deploymentConfig && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Configuration Generated Successfully
                </CardTitle>
                <CardDescription>
                  {deploymentMutation.data?.data?.filesAdded} deployment files added to
                  your project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Your deployment configuration has been generated and added to your
                  project files. Check the Infrastructure and CI/CD tabs for details.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-4">
          {deploymentConfig ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Infrastructure as Code</CardTitle>
                  <CardDescription>
                    Generated IaC files for {deploymentConfig.infrastructure.provider}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deploymentConfig.infrastructure.files.map((file: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="text-base">{file.name}</CardTitle>
                          <CardDescription>
                            Type: {file.type} | {file.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-64">
                            {file.content}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Container Configuration</CardTitle>
                  <CardDescription>Docker and Kubernetes setup</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Dockerfile</h4>
                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-64">
                      {deploymentConfig.containerization.dockerfile}
                    </pre>
                  </div>

                  {deploymentConfig.containerization.dockerCompose && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Docker Compose</h4>
                      <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-64">
                        {deploymentConfig.containerization.dockerCompose}
                      </pre>
                    </div>
                  )}

                  {deploymentConfig.containerization.kubernetesManifests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Kubernetes Manifests
                      </h4>
                      {deploymentConfig.containerization.kubernetesManifests.map(
                        (manifest: any, idx: number) => (
                          <div key={idx} className="mb-4">
                            <p className="text-xs font-medium mb-1">{manifest.name}</p>
                            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-48">
                              {manifest.content}
                            </pre>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Infrastructure Configuration
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Generate deployment configuration to see infrastructure files
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CI/CD Tab */}
        <TabsContent value="cicd" className="space-y-4">
          {deploymentConfig ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>CI/CD Pipeline</CardTitle>
                  <CardDescription>
                    Automated deployment pipeline for {deploymentConfig.cicd.platform}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pipeline Stages</h4>
                    <div className="space-y-2">
                      {deploymentConfig.cicd.stages.map((stage: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm p-2 bg-muted rounded"
                        >
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span>{stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Environment Variables
                    </h4>
                    <div className="space-y-1">
                      {deploymentConfig.cicd.environment.variables.map(
                        (variable: string, idx: number) => (
                          <div key={idx} className="text-xs font-mono bg-muted p-2 rounded">
                            {variable}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Required Secrets</h4>
                    <div className="space-y-1">
                      {deploymentConfig.cicd.environment.secrets.map(
                        (secret: string, idx: number) => (
                          <div
                            key={idx}
                            className="text-xs font-mono bg-yellow-50 p-2 rounded border border-yellow-200"
                          >
                            🔒 {secret}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Pipeline Configuration
                    </h4>
                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-96">
                      {deploymentConfig.cicd.pipelineFile}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monitoring & Observability</CardTitle>
                  <CardDescription>Monitoring tools and configurations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Monitoring Tools</h4>
                      <div className="flex flex-wrap gap-2">
                        {deploymentConfig.monitoring.tools.map(
                          (tool: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                            >
                              {tool}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Configurations</h4>
                      <ul className="space-y-1">
                        {deploymentConfig.monitoring.configurations.map(
                          (config: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {config}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No CI/CD Configuration</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Generate deployment configuration to see CI/CD pipeline
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cost Tab */}
        <TabsContent value="cost" className="space-y-4">
          {costEstimate ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Cost Estimate</CardTitle>
                  <CardDescription>
                    Estimated cloud infrastructure costs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <DollarSign className="h-12 w-12 text-green-600" />
                    <div>
                      <p className="text-3xl font-bold">
                        ${costEstimate.monthly.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">per month</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Cost Breakdown</h4>
                    {Object.entries(costEstimate.breakdown).map(
                      ([service, cost]: [string, any]) => (
                        <div
                          key={service}
                          className="flex items-center justify-between p-3 bg-muted rounded"
                        >
                          <span className="text-sm capitalize">{service}</span>
                          <span className="font-medium">${cost.toFixed(2)}</span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Assumptions</CardTitle>
                  <CardDescription>
                    Factors affecting the cost estimate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {costEstimate.assumptions.map((assumption: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-700">Cost Optimization Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Use reserved instances for predictable workloads (up to 60% savings)</li>
                    <li>• Enable auto-scaling to match demand</li>
                    <li>• Use spot instances for non-critical workloads</li>
                    <li>• Implement caching to reduce compute and database costs</li>
                    <li>• Use CDN for static assets to reduce bandwidth costs</li>
                    <li>• Set up budget alerts to monitor spending</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cost Estimate</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Generate deployment configuration to see cost estimates
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
