import { createChatCompletion } from '../anthropic';

const DEPLOYMENT_SYSTEM_PROMPT = `You are an expert DevOps engineer specializing in cloud deployment, infrastructure as code, and CI/CD pipelines. Your job is to:

1. Generate Infrastructure as Code (IaC) configurations:
   - Terraform for multi-cloud
   - AWS CloudFormation
   - Azure ARM Templates
   - Google Cloud Deployment Manager
   - Kubernetes manifests
   - Docker Compose files

2. Create CI/CD pipeline configurations:
   - GitHub Actions
   - GitLab CI/CD
   - Jenkins
   - CircleCI
   - AWS CodePipeline

3. Generate deployment configurations:
   - Docker containers
   - Kubernetes deployments
   - Serverless functions
   - Static site hosting
   - Database provisioning
   - Load balancers
   - Auto-scaling groups

4. Provide best practices:
   - Security configurations
   - High availability setup
   - Disaster recovery
   - Monitoring and logging
   - Cost optimization

Output in JSON format:
{
  "infrastructure": {
    "provider": string,
    "files": [
      {
        "name": string,
        "type": string,
        "content": string,
        "description": string
      }
    ]
  },
  "containerization": {
    "dockerfile": string,
    "dockerCompose": string,
    "kubernetesManifests": [
      {
        "name": string,
        "content": string
      }
    ]
  },
  "cicd": {
    "platform": string,
    "pipelineFile": string,
    "stages": string[],
    "environment": {
      "variables": string[],
      "secrets": string[]
    }
  },
  "monitoring": {
    "tools": string[],
    "configurations": string[]
  },
  "costEstimate": {
    "monthly": number,
    "breakdown": {
      "compute": number,
      "storage": number,
      "network": number,
      "database": number,
      "other": number
    },
    "assumptions": string[]
  },
  "documentation": string
}`;

export interface DeploymentConfig {
  infrastructure: {
    provider: string;
    files: Array<{
      name: string;
      type: string;
      content: string;
      description: string;
    }>;
  };
  containerization: {
    dockerfile: string;
    dockerCompose?: string;
    kubernetesManifests: Array<{
      name: string;
      content: string;
    }>;
  };
  cicd: {
    platform: string;
    pipelineFile: string;
    stages: string[];
    environment: {
      variables: string[];
      secrets: string[];
    };
  };
  monitoring: {
    tools: string[];
    configurations: string[];
  };
  costEstimate: {
    monthly: number;
    breakdown: {
      compute: number;
      storage: number;
      network: number;
      database: number;
      other: number;
    };
    assumptions: string[];
  };
  documentation: string;
}

export async function generateDeploymentConfig(
  projectInfo: {
    name: string;
    framework: string;
    language: string;
    hasDatabase: boolean;
    hasRedis: boolean;
    hasFileStorage: boolean;
  },
  deploymentOptions: {
    cloudProvider: 'aws' | 'azure' | 'gcp' | 'multi-cloud';
    deploymentType: 'container' | 'serverless' | 'vm' | 'static';
    cicdPlatform: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci';
    region?: string;
    scalingStrategy?: 'auto' | 'manual' | 'serverless';
  }
): Promise<DeploymentConfig> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Generate a complete deployment configuration for the following project:

**Project Information:**
- Name: ${projectInfo.name}
- Framework: ${projectInfo.framework}
- Language: ${projectInfo.language}
- Has Database: ${projectInfo.hasDatabase ? 'Yes' : 'No'}
- Has Redis Cache: ${projectInfo.hasRedis ? 'Yes' : 'No'}
- Has File Storage: ${projectInfo.hasFileStorage ? 'Yes' : 'No'}

**Deployment Requirements:**
- Cloud Provider: ${deploymentOptions.cloudProvider}
- Deployment Type: ${deploymentOptions.deploymentType}
- CI/CD Platform: ${deploymentOptions.cicdPlatform}
- Region: ${deploymentOptions.region || 'us-east-1'}
- Scaling: ${deploymentOptions.scalingStrategy || 'auto'}

Generate:
1. Infrastructure as Code files (Terraform/CloudFormation)
2. Dockerfile and container configurations
3. Kubernetes manifests if applicable
4. Complete CI/CD pipeline configuration
5. Monitoring and logging setup
6. Cost estimation with breakdown
7. Deployment documentation

Follow cloud best practices for:
- Security (IAM, secrets, encryption)
- High availability (multi-AZ)
- Scalability (auto-scaling)
- Cost optimization
- Monitoring and observability

Provide the complete configuration in the specified JSON format.`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: DEPLOYMENT_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 8000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse deployment configuration');
  }

  const config: DeploymentConfig = JSON.parse(jsonMatch[0]);

  return config;
}

export async function generateDockerfile(
  framework: string,
  language: string,
  hasDatabase: boolean,
  buildCommand?: string,
  startCommand?: string
): Promise<string> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Generate an optimized production Dockerfile for:

Framework: ${framework}
Language: ${language}
Has Database: ${hasDatabase}
Build Command: ${buildCommand || 'auto-detect'}
Start Command: ${startCommand || 'auto-detect'}

Include:
- Multi-stage build for smaller image size
- Security best practices (non-root user, minimal base image)
- Caching optimization
- Health checks
- Production-ready configuration

Return only the Dockerfile content.`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: 'You are an expert in Docker and containerization. Generate production-ready Dockerfiles following best practices.',
    temperature: 0.3,
    maxTokens: 2000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  // Extract Dockerfile content (remove markdown if present)
  const dockerfileMatch = content.match(/```dockerfile?\n([\s\S]*?)\n```/i);
  if (dockerfileMatch) {
    return dockerfileMatch[1];
  }

  // If no markdown, return as is
  return content.trim();
}

export async function generateCICDPipeline(
  platform: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci',
  projectInfo: {
    framework: string;
    language: string;
    hasTests: boolean;
    hasDocker: boolean;
  },
  deploymentTarget: {
    cloudProvider: string;
    deploymentType: string;
  }
): Promise<{
  filename: string;
  content: string;
  instructions: string;
}> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Generate a complete CI/CD pipeline configuration for ${platform}:

**Project:**
- Framework: ${projectInfo.framework}
- Language: ${projectInfo.language}
- Has Tests: ${projectInfo.hasTests}
- Uses Docker: ${projectInfo.hasDocker}

**Deployment:**
- Cloud Provider: ${deploymentTarget.cloudProvider}
- Type: ${deploymentTarget.deploymentType}

**Pipeline Stages:**
1. Install dependencies
2. Run linting
3. Run tests (if applicable)
4. Build application
5. Build Docker image (if applicable)
6. Security scanning
7. Deploy to staging
8. Deploy to production (manual approval)

Include:
- Environment variables configuration
- Secret management
- Caching for faster builds
- Parallel job execution where possible
- Deployment rollback on failure

Return in JSON format:
{
  "filename": "pipeline configuration filename",
  "content": "complete pipeline file content",
  "instructions": "setup instructions for developers"
}`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: 'You are an expert in CI/CD pipelines and DevOps automation. Generate production-ready pipeline configurations.',
    temperature: 0.3,
    maxTokens: 4000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse CI/CD pipeline configuration');
  }

  return JSON.parse(jsonMatch[0]);
}

export function generateDeploymentReport(
  projectName: string,
  config: DeploymentConfig
): string {
  let report = `# 🚀 Deployment Configuration Report

**Project:** ${projectName}
**Generated:** ${new Date().toISOString().split('T')[0]}
**Cloud Provider:** ${config.infrastructure.provider}
**CI/CD Platform:** ${config.cicd.platform}

---

## 📋 Deployment Summary

Your project is configured for cloud deployment with:
- Infrastructure as Code
- Containerization
- Automated CI/CD pipeline
- Monitoring and logging
- Cost optimization

---

## 💰 Cost Estimate

**Monthly Cost: $${config.costEstimate.monthly.toFixed(2)}**

### Breakdown

| Service | Monthly Cost |
|---------|--------------|
| Compute | $${config.costEstimate.breakdown.compute.toFixed(2)} |
| Storage | $${config.costEstimate.breakdown.storage.toFixed(2)} |
| Network | $${config.costEstimate.breakdown.network.toFixed(2)} |
| Database | $${config.costEstimate.breakdown.database.toFixed(2)} |
| Other | $${config.costEstimate.breakdown.other.toFixed(2)} |

### Assumptions
`;

  config.costEstimate.assumptions.forEach((assumption, idx) => {
    report += `${idx + 1}. ${assumption}\n`;
  });

  report += `

---

## 📦 Infrastructure Files

`;

  config.infrastructure.files.forEach((file, idx) => {
    report += `### ${idx + 1}. ${file.name}

**Type:** ${file.type}
**Description:** ${file.description}

\`\`\`${file.type}
${file.content}
\`\`\`

---

`;
  });

  report += `## 🐳 Containerization

### Dockerfile

\`\`\`dockerfile
${config.containerization.dockerfile}
\`\`\`

`;

  if (config.containerization.dockerCompose) {
    report += `### Docker Compose

\`\`\`yaml
${config.containerization.dockerCompose}
\`\`\`

`;
  }

  if (config.containerization.kubernetesManifests.length > 0) {
    report += `### Kubernetes Manifests

`;
    config.containerization.kubernetesManifests.forEach((manifest) => {
      report += `#### ${manifest.name}

\`\`\`yaml
${manifest.content}
\`\`\`

`;
    });
  }

  report += `---

## 🔄 CI/CD Pipeline

**Platform:** ${config.cicd.platform}

### Pipeline Stages

`;

  config.cicd.stages.forEach((stage, idx) => {
    report += `${idx + 1}. ${stage}\n`;
  });

  report += `

### Environment Variables

`;

  config.cicd.environment.variables.forEach((variable) => {
    report += `- \`${variable}\`\n`;
  });

  report += `

### Required Secrets

`;

  config.cicd.environment.secrets.forEach((secret) => {
    report += `- \`${secret}\`\n`;
  });

  report += `

### Pipeline Configuration

\`\`\`yaml
${config.cicd.pipelineFile}
\`\`\`

---

## 📊 Monitoring & Observability

### Tools

`;

  config.monitoring.tools.forEach((tool) => {
    report += `- ${tool}\n`;
  });

  report += `

### Configurations

`;

  config.monitoring.configurations.forEach((conf, idx) => {
    report += `${idx + 1}. ${conf}\n`;
  });

  report += `

---

## 📖 Deployment Instructions

${config.documentation}

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Review and customize infrastructure code
- [ ] Set up cloud provider account and credentials
- [ ] Configure domain name and DNS
- [ ] Set up SSL/TLS certificates
- [ ] Configure environment variables
- [ ] Set up secrets management

### Deployment
- [ ] Initialize infrastructure (terraform init/apply)
- [ ] Build and push Docker images
- [ ] Configure CI/CD pipeline
- [ ] Run initial deployment
- [ ] Verify application health
- [ ] Configure monitoring and alerts

### Post-Deployment
- [ ] Test all application endpoints
- [ ] Verify database connectivity
- [ ] Check logs and monitoring
- [ ] Set up backup and disaster recovery
- [ ] Document deployment procedures
- [ ] Train team on deployment process

---

## 🔒 Security Considerations

- All secrets should be stored in secure secret management (AWS Secrets Manager, HashiCorp Vault)
- Enable encryption at rest and in transit
- Implement proper IAM roles and policies
- Use private subnets for backend services
- Enable WAF for web applications
- Regular security updates and patches
- Implement proper logging and audit trails

---

## 📈 Scaling Strategy

- Auto-scaling configured based on CPU/memory metrics
- Database read replicas for high-traffic scenarios
- CDN for static assets
- Caching layer (Redis/CloudFront)
- Load balancing across multiple availability zones

---

*Generated by BuildrAI Deployment Agent*
`;

  return report;
}
