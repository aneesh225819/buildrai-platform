variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "ecs_task_role_arn" {
  type        = string
  description = "ARN of the ECS task role for bucket policy"
}
