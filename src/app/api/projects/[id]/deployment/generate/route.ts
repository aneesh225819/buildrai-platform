import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { secureError } from '@/lib/security/logger';
import connectDB from '@/lib/db/mongodb';
import { Project } from '@/lib/db/models';
import {
  generateDeploymentConfig,
  generateDeploymentReport,
} from '@/lib/ai/agents/deployment-agent';
import crypto from 'crypto';

// POST /api/projects/:id/deployment/generate - Generate deployment configuration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id: projectId } = await params;
    const body = await req.json();

    const {
      cloudProvider = 'aws',
      deploymentType = 'container',
      cicdPlatform = 'github-actions',
      region = 'us-east-1',
      scalingStrategy = 'auto',
    } = body;

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Detect project characteristics
    const hasDatabase = project.files.some((f: any) =>
      ['prisma', 'mongoose', 'typeorm', 'sequelize', 'knex'].some((db) =>
        f.path.toLowerCase().includes(db)
      )
    );

    const hasRedis = project.files.some((f: any) =>
      f.content.toLowerCase().includes('redis')
    );

    const hasFileStorage = project.files.some((f: any) =>
      ['s3', 'storage', 'upload'].some((keyword) =>
        f.path.toLowerCase().includes(keyword)
      )
    );

    // Generate deployment configuration
    const deploymentConfig = await generateDeploymentConfig(
      {
        name: project.name,
        framework: project.settings.framework,
        language: project.settings.language,
        hasDatabase,
        hasRedis,
        hasFileStorage,
      },
      {
        cloudProvider,
        deploymentType,
        cicdPlatform,
        region,
        scalingStrategy,
      }
    );

    // Generate deployment report
    const report = generateDeploymentReport(project.name, deploymentConfig);

    // Add deployment files to project
    const deploymentFiles: any[] = [];

    // Add infrastructure files
    deploymentConfig.infrastructure.files.forEach((file) => {
      deploymentFiles.push({
        path: file.name,
        content: file.content,
        language: file.type === 'terraform' ? 'hcl' : 'yaml',
        size: Buffer.from(file.content).length,
        createdBy: 'ai' as const,
        version: 1,
        hash: crypto.createHash('sha256').update(file.content).digest('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Add Dockerfile
    deploymentFiles.push({
      path: 'Dockerfile',
      content: deploymentConfig.containerization.dockerfile,
      language: 'dockerfile',
      size: Buffer.from(deploymentConfig.containerization.dockerfile).length,
      createdBy: 'ai' as const,
      version: 1,
      hash: crypto
        .createHash('sha256')
        .update(deploymentConfig.containerization.dockerfile)
        .digest('hex'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add Docker Compose if present
    if (deploymentConfig.containerization.dockerCompose) {
      deploymentFiles.push({
        path: 'docker-compose.yml',
        content: deploymentConfig.containerization.dockerCompose,
        language: 'yaml',
        size: Buffer.from(deploymentConfig.containerization.dockerCompose).length,
        createdBy: 'ai' as const,
        version: 1,
        hash: crypto
          .createHash('sha256')
          .update(deploymentConfig.containerization.dockerCompose)
          .digest('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Add CI/CD pipeline file
    const pipelineFilename =
      cicdPlatform === 'github-actions'
        ? '.github/workflows/deploy.yml'
        : cicdPlatform === 'gitlab-ci'
        ? '.gitlab-ci.yml'
        : cicdPlatform === 'circleci'
        ? '.circleci/config.yml'
        : 'Jenkinsfile';

    deploymentFiles.push({
      path: pipelineFilename,
      content: deploymentConfig.cicd.pipelineFile,
      language: 'yaml',
      size: Buffer.from(deploymentConfig.cicd.pipelineFile).length,
      createdBy: 'ai' as const,
      version: 1,
      hash: crypto
        .createHash('sha256')
        .update(deploymentConfig.cicd.pipelineFile)
        .digest('hex'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add Kubernetes manifests
    deploymentConfig.containerization.kubernetesManifests.forEach((manifest) => {
      deploymentFiles.push({
        path: `k8s/${manifest.name}`,
        content: manifest.content,
        language: 'yaml',
        size: Buffer.from(manifest.content).length,
        createdBy: 'ai' as const,
        version: 1,
        hash: crypto.createHash('sha256').update(manifest.content).digest('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Add deployment files to project
    project.files.push(...deploymentFiles);
    project.updateStats();
    await project.save();

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        projectName: project.name,
        deploymentConfig,
        report,
        filesAdded: deploymentFiles.length,
        generatedAt: new Date().toISOString(),
      },
      message: `Generated ${deploymentFiles.length} deployment configuration files`,
    });
  } catch (error: any) {
    secureError('Error generating deployment config:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate deployment configuration',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
