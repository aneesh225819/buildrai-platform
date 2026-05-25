# BuildRAI Deployment Guide

## Prerequisites

Before deploying BuildRAI to AWS ECS, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Terraform** installed (v1.0+)
4. **Docker** installed
5. **Domain name** (for HTTPS)
6. **MongoDB** instance (Atlas or DocumentDB)
7. **Environment variables** configured

## Quick Start

### 1. Set up AWS CLI

```bash
export AWS_DEFAULT_PROFILE=aneesh-personal
aws configure --profile aneesh-personal
```

### 2. Create S3 Bucket for Terraform State

```bash
aws s3 mb s3://buildrai-terraform-state --region ap-south-1
aws dynamodb create-table \
  --table-name buildrai-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### 3. Create ACM Certificate

```bash
# Request certificate
aws acm request-certificate \
  --domain-name buildrai.com \
  --subject-alternative-names "*.buildrai.com" \
  --validation-method DNS \
  --region ap-south-1

# Note the CertificateArn from output
# Add DNS validation records to your domain
```

### 4. Create MongoDB (Choose One)

#### Option A: MongoDB Atlas (Recommended)
1. Go to https://cloud.mongodb.com
2. Create M10 cluster in Mumbai (ap-south-1)
3. Whitelist ECS IP ranges
4. Get connection string

#### Option B: AWS DocumentDB
```bash
terraform -chdir=terraform/modules/documentdb apply
```

### 5. Store Secrets in AWS Secrets Manager

```bash
# MongoDB URI
aws secretsmanager create-secret \
  --name /buildrai/prod/mongodb-uri \
  --description "MongoDB connection string" \
  --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/buildrai" \
  --region ap-south-1

# Anthropic API Key
aws secretsmanager create-secret \
  --name /buildrai/prod/anthropic-api-key \
  --secret-string "sk-ant-..." \
  --region ap-south-1

# Clerk Keys
aws secretsmanager create-secret \
  --name /buildrai/prod/clerk-secret-key \
  --secret-string "sk_..." \
  --region ap-south-1

aws secretsmanager create-secret \
  --name /buildrai/prod/clerk-publishable-key \
  --secret-string "pk_..." \
  --region ap-south-1

# OAuth Token Encryption Key
aws secretsmanager create-secret \
  --name /buildrai/prod/token-encryption-key \
  --secret-string "$(openssl rand -base64 32)" \
  --region ap-south-1

# GitHub OAuth
aws secretsmanager create-secret \
  --name /buildrai/prod/github-client-id \
  --secret-string "your_github_client_id" \
  --region ap-south-1

aws secretsmanager create-secret \
  --name /buildrai/prod/github-client-secret \
  --secret-string "your_github_client_secret" \
  --region ap-south-1
```

### 6. Update Terraform Variables

Edit `terraform/environments/prod/terraform.tfvars`:

```hcl
domain_name     = "buildrai.com"
certificate_arn = "arn:aws:acm:ap-south-1:YOUR_ACCOUNT:certificate/YOUR_CERT_ID"
app_image       = "YOUR_ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/buildrai:latest"
```

### 7. Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file=environments/prod/terraform.tfvars

# Apply (deploy)
terraform apply -var-file=environments/prod/terraform.tfvars
```

### 8. Build and Push Docker Image

```bash
# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=ap-south-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build image
docker build -t buildrai .

# Tag image
docker tag buildrai:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/buildrai:latest

# Push image
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/buildrai:latest
```

### 9. Deploy Application

```bash
# Force new deployment
aws ecs update-service \
  --cluster buildrai-prod-cluster \
  --service buildrai-prod-service \
  --force-new-deployment \
  --region ap-south-1
```

### 10. Configure DNS

Get the ALB DNS name:

```bash
terraform output alb_dns_name
```

Add CNAME record in your DNS:
```
buildrai.com → CNAME → buildrai-prod-alb-XXXXXXX.ap-south-1.elb.amazonaws.com
```

### 11. Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster buildrai-prod-cluster \
  --services buildrai-prod-service \
  --region ap-south-1

# Check health
curl https://buildrai.com/api/health
```

## CI/CD Setup (GitHub Actions)

### Add GitHub Secrets

1. Go to Repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### Automatic Deployments

Push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

## Local Testing

Test the Docker image locally:

```bash
# Start services
docker-compose up

# Access app
open http://localhost:3000

# Check health
curl http://localhost:3000/api/health
```

## Monitoring

### CloudWatch Logs

```bash
# View logs
aws logs tail /ecs/buildrai-prod --follow --region ap-south-1
```

### CloudWatch Metrics

View in AWS Console:
- ECS → Clusters → buildrai-prod-cluster → Metrics

## Troubleshooting

### Service Not Starting

```bash
# Check task status
aws ecs describe-tasks \
  --cluster buildrai-prod-cluster \
  --tasks $(aws ecs list-tasks --cluster buildrai-prod-cluster --service buildrai-prod-service --query 'taskArns[0]' --output text) \
  --region ap-south-1
```

### Health Check Failing

```bash
# Check logs
aws logs tail /ecs/buildrai-prod --since 30m --region ap-south-1
```

### Database Connection Issues

1. Verify security group allows ECS tasks
2. Check MongoDB Atlas IP whitelist
3. Verify connection string in Secrets Manager

## Scaling

### Manual Scaling

```bash
aws ecs update-service \
  --cluster buildrai-prod-cluster \
  --service buildrai-prod-service \
  --desired-count 4 \
  --region ap-south-1
```

### Auto Scaling

Already configured in Terraform:
- Min: 2 tasks
- Max: 10 tasks
- Target: 70% CPU utilization

## Cost Optimization

### Development Environment

Reduce costs for dev:
```hcl
# terraform/environments/dev/terraform.tfvars
desired_count = 1
min_capacity  = 1
max_capacity  = 2
task_cpu      = 512  # 0.5 vCPU
task_memory   = 1024 # 1 GB
```

### Stop Development Environment

```bash
# Scale to zero
aws ecs update-service \
  --cluster buildrai-dev-cluster \
  --service buildrai-dev-service \
  --desired-count 0 \
  --region ap-south-1
```

## Backup & Recovery

### Database Backups

MongoDB Atlas: Automatic daily backups (7-day retention)

### Infrastructure Backup

All infrastructure is defined as code in Terraform.

To rebuild from scratch:
```bash
terraform destroy -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

## Security Best Practices

1. ✅ All traffic uses HTTPS (TLS 1.3)
2. ✅ Secrets stored in AWS Secrets Manager
3. ✅ Tasks run in private subnets
4. ✅ Security groups restrict access
5. ✅ Container runs as non-root user
6. ✅ Regular security updates via base image

## Support

For issues or questions:
- Check logs: `aws logs tail /ecs/buildrai-prod --follow`
- Review metrics in CloudWatch
- Check ECS service events in AWS Console

## Next Steps

1. Set up monitoring alerts
2. Configure backup schedule
3. Set up staging environment
4. Implement blue/green deployments
5. Add WAF for DDoS protection
