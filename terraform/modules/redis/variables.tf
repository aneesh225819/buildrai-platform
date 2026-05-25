# Redis Module Variables

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet IDs for Redis"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ECS tasks security group ID that needs access to Redis"
  type        = string
}

variable "redis_node_type" {
  description = "Redis node instance type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "redis_parameter_group_name" {
  description = "Redis parameter group name"
  type        = string
  default     = "default.redis7"
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = false
}
