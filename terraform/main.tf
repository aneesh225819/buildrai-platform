# BuildRAI Infrastructure - Main Terraform Configuration
# Deploy to AWS Mumbai (ap-south-1)

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "BuildRAI"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name        = var.project_name
  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  enable_nat_gateway  = var.enable_nat_gateway
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  project_name    = var.project_name
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  public_subnets  = module.vpc.public_subnet_ids
  certificate_arn = var.certificate_arn
}

# Data source for AWS account ID
data "aws_caller_identity" "current" {}

# ECR Repository
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# S3 Bucket for file storage
module "s3" {
  source = "./modules/s3"

  project_name       = var.project_name
  environment        = var.environment
  domain_name        = var.domain_name
}

# ECS Cluster and Services (with Redis configuration)
module "ecs" {
  source = "./modules/ecs"

  project_name           = var.project_name
  environment            = var.environment
  aws_region             = var.aws_region
  aws_account_id         = data.aws_caller_identity.current.account_id
  vpc_id                 = module.vpc.vpc_id
  private_subnets        = module.vpc.private_subnet_ids
  public_subnets         = module.vpc.public_subnet_ids
  use_public_subnets     = var.use_public_subnets
  target_group_arn       = module.alb.target_group_arn
  alb_security_group_id  = module.alb.security_group_id
  alb_listener_arn       = module.alb.https_listener_arn

  # Service configuration
  app_image      = var.app_image
  desired_count  = var.desired_count
  task_cpu       = var.task_cpu
  task_memory    = var.task_memory
  min_capacity   = var.min_capacity
  max_capacity   = var.max_capacity

  # S3 bucket details
  domain_name    = var.domain_name
  s3_bucket_name = module.s3.bucket_name
  s3_bucket_arn  = module.s3.bucket_arn

  # Redis configuration (added after Redis module creation)
  redis_host = module.redis.redis_endpoint
  redis_port = module.redis.redis_port

  depends_on = [module.s3]
}

# ElastiCache Redis (created after ECS to use its security group)
module "redis" {
  source = "./modules/redis"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnets        = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.ecs.security_group_id
  redis_node_type        = var.redis_node_type
  enable_backup          = var.enable_redis_backup
}

# Output ECS security group ID for reference
output "ecs_security_group_id" {
  value = module.ecs.security_group_id
}

# Output Redis endpoint for reference
output "redis_endpoint" {
  value       = module.redis.redis_endpoint
  description = "Redis endpoint address"
}
