# Production Environment Configuration
# Mumbai Region (ap-south-1)

aws_region   = "ap-south-1"
project_name = "buildrai"
environment  = "prod"

# Domain and SSL
domain_name     = "buildrai.com"
certificate_arn = "arn:aws:acm:ap-south-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID"  # Update after creating ACM certificate

# Docker Image
# Update after pushing to ECR
app_image = "YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/buildrai-prod:latest"

# Network
vpc_cidr = "10.0.0.0/16"

# ECS Configuration
task_cpu      = 1024  # 1 vCPU
task_memory   = 2048  # 2 GB
desired_count = 2     # Initial task count
min_capacity  = 2     # Auto-scaling minimum
max_capacity  = 10    # Auto-scaling maximum
