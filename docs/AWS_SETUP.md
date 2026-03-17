# AWS Setup Guide — Secure Credential Management

## Overview

wolfir uses **secure, local AWS credential management**. Your credentials are **never stored on our servers**. All AWS API calls are made directly from the backend using your local AWS CLI configuration.

## Authentication Methods

### Method 1: AWS CLI Profile (Recommended)

**How it works:**
- Configure AWS credentials locally using AWS CLI
- Backend reads credentials from `~/.aws/credentials` on your machine
- Credentials never leave your local machine
- No credentials transmitted over the network

**Setup Steps:**

1. **Install AWS CLI** (if not already installed):
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   sudo apt-get install awscli
   
   # Windows
   # Download from: https://aws.amazon.com/cli/
   ```

2. **Configure AWS Profile:**
   ```bash
   aws configure --profile wolfir
   ```
   
   Enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `us-east-1`
   - Default output format: `json`

3. **Verify Connection:**
   - Open wolfir frontend
   - Go to "Real AWS Account" tab
   - Click "Test AWS Connection"
   - Should show: ✅ "Successfully connected to AWS account"

**Required Permissions:**
- `cloudtrail:LookupEvents` - Read CloudTrail events
- `bedrock:InvokeModel` - Use Nova AI models
- `sts:GetCallerIdentity` - Verify identity (automatic)

See [IAM-POLICY-CLOUDTRAIL.md](IAM-POLICY-CLOUDTRAIL.md) for full IAM policy JSON.

### Method 2: Environment Variables (Alternative)

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1

# Then run backend
cd backend
python main.py
```

### Method 3: AWS SSO (Enterprise)

For AWS IAM Identity Center (SSO):
```bash
aws configure sso --profile wolfir
aws sso login --profile wolfir
```

## Security Features

- **No Credential Storage**: Credentials are never stored in our database or transmitted to our servers
- **Local-Only Access**: Backend reads credentials from your local machine only
- **Direct AWS API Calls**: All AWS API calls are made directly from backend to AWS (no proxy)
- **Revocable Access**: Remove AWS profile anytime to revoke access
- **Least Privilege**: Only requires read permissions for CloudTrail and Bedrock

## Quick Start

1. **Clone and install:**
   ```bash
   git clone https://github.com/bhavikam28/wolfir
   cd wolfir
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure --profile wolfir
   ```

3. **Start backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

4. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Test connection:**
   - Open http://localhost:5173
   - Go to "Real AWS Account" tab
   - Click "Test AWS Connection"
   - Once connected, click "Analyze Real CloudTrail Events"

### Demo Mode (No AWS Required)

- Use the **"Demo Scenarios"** tab to explore pre-built security incident scenarios
- Full wolfir capabilities available without AWS access
- For real CloudTrail analysis, connect your AWS account

## Troubleshooting

### "Credentials not found"
- Ensure AWS CLI is installed: `aws --version`
- Check profile exists: `aws configure list-profiles`
- Verify credentials file: `cat ~/.aws/credentials`

### "CloudTrail access denied"
- Ensure IAM user/role has `cloudtrail:LookupEvents` permission
- Check region matches (default: `us-east-1`)

### "Bedrock access denied"
- Ensure Bedrock is enabled in your AWS account
- Verify region supports Bedrock — use `us-east-1` (recommended)
- Check IAM permissions include `bedrock:InvokeModel`
- **Nova 2 Lite requires cross-region inference to be enabled.** Go to AWS Bedrock Console → Model access → enable cross-region inference for `us.amazon.nova-2-lite-v1:0`. This is free to enable and takes under a minute.
- **Nova 2 Sonic** may require separate model access request in Bedrock Console → Model access.

## Architecture

```
Your Machine
├── ~/.aws/credentials (local file, never transmitted)
├── Backend (reads credentials locally)
│   ├── CloudTrail Service → AWS CloudTrail API
│   ├── Bedrock Service → AWS Bedrock API
│   └── DynamoDB Service → AWS DynamoDB API
└── Frontend (no AWS credentials)
    └── Makes API calls to local backend
```

All AWS credentials stay on your machine. The backend uses your credentials locally to make AWS API calls.
