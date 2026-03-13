# Optional: Bedrock Knowledge Base (S3 Vectors)

This Terraform creates an S3 bucket and uploads sample security playbooks. You then create a **Bedrock Knowledge Base with S3 Vectors** in the console and connect it to this bucket.

**Why optional?** wolfir works without a Knowledge Base. This adds RAG for enhanced playbook retrieval. Users can skip this step.

## Prerequisites

- AWS CLI configured
- Terraform >= 1.0

## Deploy

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Create Knowledge Base (Console)

1. **Bedrock console** → Knowledge bases → **Create knowledge base**
2. **Name:** `wolfir-playbooks`
3. **Vector store:** Quick create → **S3 vector bucket**
4. **Data source:** Create new → S3 URI: `s3://<bucket-from-output>/`
5. **Embedding model:** `amazon.titan-embed-text-v2:0` or Nova embeddings
6. **Sync** the data source after creation
7. Copy the **Knowledge base ID** → set `KNOWLEDGE_BASE_ID` in `.env`

## Cost

- S3: ~$0.023/GB/month for storage
- S3 Vectors: Cost-effective vs OpenSearch Serverless
- Bedrock: Per-token for embeddings and retrieval

## Cleanup

```bash
terraform destroy
```
