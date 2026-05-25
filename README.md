# BuildRAI Platform

AI-powered code generation platform with OAuth integration and AWS ECS deployment.

## Repository

**GitHub**: https://github.com/aneesh225819/buildrai-platform

## What's Included

### Application Features
- Next.js 16.2.6 with App Router and TypeScript
- OAuth integration (GitHub, Bitbucket, Azure Repos)
- Data source integration for project creation
- AI-powered code generation using Claude
- MongoDB database integration
- Secure token encryption (AES-256-GCM)

### Deployment Infrastructure
- Docker multi-stage build for production
- Complete Terraform infrastructure for AWS ECS
- VPC with public/private subnets across 2 AZs
- Application Load Balancer with HTTPS
- ECS Fargate cluster with auto-scaling (2-10 tasks)
- S3 bucket for file storage
- ECR repository with image scanning
- GitHub Actions CI/CD pipeline
- CloudWatch logging and monitoring

### Documentation
- `DEPLOYMENT.md` - Complete deployment guide
- `MICROSERVICES_ARCHITECTURE.md` - Architecture documentation
- `OAUTH_SETUP.md` - OAuth configuration guide

## Architecture

**Current**: Monolith deployed on AWS ECS Fargate
**Future**: Microservices architecture (8 services planned)

## Tech Stack

- **Framework**: Next.js 16.2.6
- **Language**: TypeScript
- **Database**: MongoDB
- **AI**: Anthropic Claude API
- **Cloud**: AWS (ECS, ALB, S3, ECR, VPC)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

## Quick Start - Local Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

3. Start development server:
```bash
npm run dev
```

4. Access at http://localhost:3000

## Deployment to AWS ECS (Mumbai Region)

Complete guide in `DEPLOYMENT.md`. Quick summary:

### Prerequisites
- AWS CLI with `aneesh-personal` profile
- Terraform v1.0+
- Docker
- Domain with DNS access
- MongoDB (Atlas or DocumentDB)

### Deployment Commands

```bash
# 1. Create Terraform state bucket
aws s3 mb s3://buildrai-terraform-state --region ap-south-1 --profile aneesh-personal

# 2. Deploy infrastructure
cd terraform
terraform init
terraform apply -var-file=environments/prod/terraform.tfvars

# 3. Build and push Docker image
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile aneesh-personal)
aws ecr get-login-password --region ap-south-1 --profile aneesh-personal | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
docker build -t buildrai .
docker tag buildrai:latest $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/buildrai-prod:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/buildrai-prod:latest

# 4. Deploy to ECS
aws ecs update-service \
  --cluster buildrai-prod-cluster \
  --service buildrai-prod-service \
  --force-new-deployment \
  --region ap-south-1 \
  --profile aneesh-personal
```

## CI/CD

Automatic deployment on push to `main` branch.

Setup GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Monitoring

```bash
# View logs
aws logs tail /ecs/buildrai-prod --follow --region ap-south-1 --profile aneesh-personal

# Health check
curl https://buildrai.com/api/health
```

## Cost Estimate

**~$700-900/month** for production
- ECS Fargate: $400-500
- ALB: $20
- NAT Gateway: $100
- S3: $10
- MongoDB Atlas M10: $57
- Data transfer: $100

## Security

- HTTPS with TLS 1.3
- Secrets in AWS Secrets Manager
- Private subnets for tasks
- Security groups
- Non-root container
- AES-256-GCM token encryption

## Future: Microservices

When ready to scale:
1. Auth Service
2. Project Service
3. Code Generation Service
4. Integration Service
5. File Service
6. Analytics Service
7. WebSocket Service
8. API Gateway

See `MICROSERVICES_ARCHITECTURE.md` for details.

---

**Repository**: https://github.com/aneesh225819/buildrai-platform

Ready for deployment to AWS ECS Mumbai (ap-south-1)
