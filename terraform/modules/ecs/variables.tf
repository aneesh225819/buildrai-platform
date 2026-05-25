variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "aws_account_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "public_subnets" {
  type        = list(string)
  default     = []
  description = "Public subnets for dev/micro environments without NAT Gateway"
}

variable "use_public_subnets" {
  type        = bool
  default     = false
  description = "Use public subnets for ECS tasks (dev only, saves NAT Gateway cost)"
}

variable "target_group_arn" {
  type = string
}

variable "alb_security_group_id" {
  type = string
}

variable "alb_listener_arn" {
  type = string
}

variable "app_image" {
  type        = string
  description = "Docker image for the application"
}

variable "task_cpu" {
  type        = number
  default     = 1024
  description = "CPU units for the task (1024 = 1 vCPU)"
}

variable "task_memory" {
  type        = number
  default     = 2048
  description = "Memory in MB for the task"
}

variable "desired_count" {
  type        = number
  default     = 2
  description = "Desired number of tasks"
}

variable "min_capacity" {
  type        = number
  default     = 2
  description = "Minimum number of tasks for auto-scaling"
}

variable "max_capacity" {
  type        = number
  default     = 10
  description = "Maximum number of tasks for auto-scaling"
}

variable "domain_name" {
  type = string
}

variable "s3_bucket_name" {
  type = string
}

variable "s3_bucket_arn" {
  type = string
}

variable "redis_host" {
  type        = string
  default     = ""
  description = "Redis endpoint host"
}

variable "redis_port" {
  type        = number
  default     = 6379
  description = "Redis port"
}
