# BuildRAI Micro Deployment Guide
## Ultra-Low Cost Setup (~$50-75/month)

This guide helps you deploy BuildRAI on a minimal budget for development/testing.

## Cost Comparison

### Standard Production Setup: ~$700-900/month
- NAT Gateway: ~$100/month
- ECS Fargate (2-10 tasks, 1 vCPU, 2GB each): ~$400-500/month
- MongoDB Atlas M10: ~$57/month
- ALB: ~$20/month
- Other services: ~$123/month

### Micro Setup: ~$50-75/month ✅
- **No NAT Gateway**: $0 (tasks use public IPs)
- **Single ECS task (0.5 vCPU, 1GB)**: ~$15-20/month
- **MongoDB Atlas Free Tier (M0)**: $0
- **ALB**: ~$20/month
- **S3, ECR, logs**: ~$10/month

## Architecture Changes for Micro Setup

### Standard (Secure):
```
Internet → ALB → Private Subnet (ECS) → NAT Gateway → Internet
                                      ↓
                                   MongoDB
```

### Micro (Less Secure, Cheaper):
```
Internet → ALB → Public Subnet (ECS) → Internet Gateway → Internet
                                     ↓
                                  MongoDB (Free Tier)
```

**Trade-off**: ECS tasks get public IPs (less secure) but saves $100/month on NAT Gateway.

## Prerequisites

Same as standard deployment but:
- Use **MongoDB Atlas Free Tier (M0)** instead of M10
- All other requirements same

## Deployment Steps

### 1. Setup MongoDB Atlas Free Tier

1. Go to https://cloud.mongodb.com
2. Create **M0 Free Tier** cluster in Mumbai (ap-south-1)
3. Whitelist `0.0.0.0/0` (since ECS tasks will have dynamic public IPs)
4. Get connection string

**Free Tier Limits**:
- 512 MB storage
- Shared CPU
- Perfect for development/testing

### 2. Setup AWS (Same as Standard)

```bash
export AWS_DEFAULT_PROFILE=aneesh-personal

# Create S3 bucket for Terraform state
aws s3 mb s3://buildrai-terraform-state-dev --region ap-south-1

# Create DynamoDB table
aws dynamodb create-table \
  --table-name buildrai-terraform-locks-dev \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1

# Request ACM certificate
aws acm request-certificate \
  --domain-name dev.buildrai.com \
  --validation-method DNS \
  --region ap-south-1
```

### 3. Store Secrets

```bash
# MongoDB URI (Free Tier)
aws secretsmanager create-secret \
  --name /buildrai/dev/mongodb-uri \
  --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/buildrai?retryWrites=true&w=majority" \
  --region ap-south-1

# Other secrets (same as production)
aws secretsmanager create-secret \
  --name /buildrai/dev/anthropic-api-key \
  --secret-string "sk-ant-..." \
  --region ap-south-1

# ... (create all other secrets)
```

### 4. Update Terraform Backend

Edit `terraform/backend.tf` for dev:

```hcl
terraform {
  backend "s3" {
    bucket         = "buildrai-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "buildrai-terraform-locks-dev"
    encrypt        = true
  }
}
```

### 5. Update Dev Configuration

Edit `terraform/environments/dev/terraform.tfvars`:

```hcl
aws_region   = "ap-south-1"
project_name = "buildrai"
environment  = "dev"

# Your domain
domain_name     = "dev.buildrai.com"
certificate_arn = "arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/CERT_ID"

# Docker image
app_image = "ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/buildrai-dev:latest"

# Network
vpc_cidr = "10.0.0.0/16"

# MICRO CONFIGURATION - Cost savings
task_cpu      = 512   # 0.5 vCPU
task_memory   = 1024  # 1 GB
desired_count = 1     # Single task
min_capacity  = 1
max_capacity  = 2

# Cost-saving options
enable_nat_gateway = false  # Save $100/month
use_public_subnets = true   # ECS tasks in public subnet
```

### 6. Deploy Infrastructure

```bash
cd terraform

# Initialize
terraform init

# Plan with dev config
terraform plan -var-file=environments/dev/terraform.tfvars \
  -var="enable_nat_gateway=false" \
  -var="use_public_subnets=true"

# Apply
terraform apply -var-file=environments/dev/terraform.tfvars \
  -var="enable_nat_gateway=false" \
  -var="use_public_subnets=true"
```

### 7. Build and Push Docker Image

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com

# Build for smaller size
docker build \
  --build-arg NODE_ENV=production \
  -t buildrai .

# Tag and push
docker tag buildrai:latest $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/buildrai-dev:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/buildrai-dev:latest
```

### 8. Deploy to ECS

```bash
aws ecs update-service \
  --cluster buildrai-dev-cluster \
  --service buildrai-dev-service \
  --force-new-deployment \
  --region ap-south-1
```

### 9. Configure DNS

Point `dev.buildrai.com` to your ALB DNS name.

## Monthly Cost Breakdown

| Service | Micro Setup | Notes |
|---------|-------------|-------|
| ECS Fargate (1 task, 0.5 vCPU, 1GB) | $15-20 | ~$0.02496/hour |
| Application Load Balancer | $20-25 | $0.0225/hour + $0.008/LCU-hour |
| NAT Gateway | **$0** | Disabled (uses Internet Gateway) |
| S3 Storage | $5 | Minimal usage |
| ECR | $1 | Storage for Docker images |
| CloudWatch Logs | $3-5 | Log retention |
| Data Transfer | $5-10 | Minimal traffic |
| MongoDB Atlas | **$0** | M0 Free Tier |
| **Total** | **$49-66/month** | Perfect for dev/testing |

## Limitations & Trade-offs

### Security
- ❌ ECS tasks have public IPs (less secure)
- ❌ No private subnet isolation
- ✅ Still have security groups
- ✅ Still HTTPS with TLS 1.3

### Performance
- ❌ Single small task (0.5 vCPU, 1GB)
- ❌ Limited auto-scaling (max 2 tasks)
- ❌ MongoDB shared resources
- ✅ Fine for development/testing
- ✅ Can handle 10-50 concurrent users

### Database
- ❌ MongoDB M0: 512MB limit
- ❌ Shared CPU
- ❌ No backups on free tier
- ✅ Free!
- ✅ Upgrade to M10 when needed

## When to Upgrade to Production

Upgrade when you need:
1. More than 512MB database storage
2. More than 50 concurrent users
3. Better security (private subnets)
4. High availability (multiple tasks)
5. Production-grade backups

Simply change `terraform/environments/prod/terraform.tfvars`:
```hcl
enable_nat_gateway = true
use_public_subnets = false
task_cpu      = 1024  # 1 vCPU
task_memory   = 2048  # 2 GB
desired_count = 2     # Multiple tasks
min_capacity  = 2
max_capacity  = 10
```

Then upgrade MongoDB to M10 (~$57/month).

## Monitoring (Same as Production)

```bash
# View logs
aws logs tail /ecs/buildrai-dev --follow --region ap-south-1

# Health check
curl https://dev.buildrai.com/api/health

# Check ECS service
aws ecs describe-services \
  --cluster buildrai-dev-cluster \
  --services buildrai-dev-service \
  --region ap-south-1
```

## Scaling Up Gradually

### Phase 1: Micro ($50/month)
- 1 task, 0.5 vCPU, 1GB
- No NAT Gateway
- MongoDB Free Tier

### Phase 2: Small ($150/month)
- 1 task, 1 vCPU, 2GB
- Add NAT Gateway
- Upgrade to MongoDB M10

### Phase 3: Production ($700/month)
- 2-10 tasks, 1 vCPU, 2GB each
- Full high availability
- MongoDB M10 with backups

## Troubleshooting

### Task can't connect to internet
Check security group allows outbound traffic:
```bash
aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=buildrai-dev-ecs-tasks-sg" \
  --region ap-south-1
```

### MongoDB connection issues
Ensure IP whitelist includes `0.0.0.0/0` in MongoDB Atlas.

### High costs
Check you disabled NAT Gateway:
```bash
aws ec2 describe-nat-gateways --region ap-south-1
```

Should return empty for dev environment.

---

**Cost-effective development setup ready! Total: ~$50-75/month**
