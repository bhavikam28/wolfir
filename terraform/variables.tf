variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name_prefix" {
  description = "Prefix for the S3 bucket name (account ID is appended)"
  type        = string
  default     = "wolfir-kb-playbooks"
}
