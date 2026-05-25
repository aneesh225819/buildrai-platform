# BuildRAI Infrastructure - Main Terraform Configuration
# Deploy to AWS Mumbai (ap-south-1)

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for state storage
  backend "s3" {
    bucket         = "buildrai-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "buildrai-terraform-locks"
  }
}

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

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
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
  ecs_task_role_arn  = module.ecs.task_role_arn
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"

  project_name           = var.project_name
  environment            = var.environment
  aws_region             = var.aws_region
  aws_account_id         = data.aws_caller_identity.current.account_id
  vpc_id                 = module.vpc.vpc_id
  private_subnets        = module.vpc.private_subnet_ids
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

  depends_on = [module.s3]
}
