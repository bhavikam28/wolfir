output "s3_bucket_name" {
  description = "S3 bucket containing playbooks for Knowledge Base ingestion"
  value       = aws_s3_bucket.kb_source.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.kb_source.arn
}

output "next_steps" {
  description = "Instructions for creating the Knowledge Base"
  value       = <<-EOT

    Next steps to create your Bedrock Knowledge Base with S3 Vectors:

    1. Open Amazon Bedrock console → Knowledge bases → Create knowledge base
    2. Name: wolfir-playbooks (or your choice)
    3. Choose "Quick create a new vector store" → Select "S3 vector bucket"
    4. For Data source: Create new S3 data source
       - S3 URI: s3://${aws_s3_bucket.kb_source.id}/
       - Create an IAM role (or use existing with S3 read access)
    5. Select embedding model: amazon.titan-embed-text-v2:0 (or Nova embeddings)
    6. After creation, run Sync on the data source
    7. Copy the Knowledge base ID and set in .env:
       KNOWLEDGE_BASE_ID=<your-kb-id>

    wolfir will use this for enhanced playbook retrieval when configured.
  EOT
}
