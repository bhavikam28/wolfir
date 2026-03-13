# wolfir — Optional Knowledge Base (S3 Vectors)
# Deploy this to create an S3 bucket with sample security playbooks.
# Then create a Bedrock Knowledge Base in the console with S3 Vectors (Quick create)
# and connect it to this bucket. Set KNOWLEDGE_BASE_ID in your .env.

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for knowledge base source documents (playbooks)
resource "aws_s3_bucket" "kb_source" {
  bucket        = "${var.bucket_name_prefix}-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "kb_source" {
  bucket = aws_s3_bucket.kb_source.id

  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "kb_source" {
  bucket = aws_s3_bucket.kb_source.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "kb_source" {
  bucket = aws_s3_bucket.kb_source.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls     = true
  restrict_public_buckets = true
}

# Upload sample playbooks from playbooks/ directory
resource "aws_s3_object" "playbooks" {
  for_each = fileset("${path.module}/../playbooks", "**/*.md")

  bucket       = aws_s3_bucket.kb_source.id
  key          = "playbooks/${each.key}"
  source       = "${path.module}/../playbooks/${each.key}"
  content_type = "text/markdown"
  etag         = filemd5("${path.module}/../playbooks/${each.key}")
}

data "aws_caller_identity" "current" {}
