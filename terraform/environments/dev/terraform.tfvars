# Development Environment - Micro Setup (~$50-75/month)
# Mumbai Region (ap-south-1)

aws_region   = "ap-south-1"
project_name = "buildrai"
environment  = "dev"

# Domain and SSL
domain_name     = "buildrai.honeykode.com"
certificate_arn = "arn:aws:acm:ap-south-1:211125782339:certificate/3e415b02-5267-41ba-b20e-ca36edcf89b8"

# Docker Image (update after first ECR push)
app_image = "211125782339.dkr.ecr.ap-south-1.amazonaws.com/buildrai-dev:latest"

# Network
vpc_cidr = "10.0.0.0/16"

# MICRO ECS Configuration - Cost savings
task_cpu      = 512   # 0.5 vCPU (smallest)
task_memory   = 1024  # 1 GB (smallest)
desired_count = 1     # Single task only
min_capacity  = 1     # No scaling down
max_capacity  = 2     # Minimal scaling up

# Cost-saving options (saves $100/month on NAT Gateway)
enable_nat_gateway = false  # No NAT Gateway
use_public_subnets = true   # ECS tasks get public IPs
