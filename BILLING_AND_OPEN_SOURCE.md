# 💰 AWS Billing & Open Source - Important Information

## ✅ **You Will NOT Be Charged When Others Use This Project**

### How It Works

**Each user uses their own AWS account and credentials.**

When someone clones and runs this project:
1. They configure their own AWS credentials (via `.env` file or AWS CLI)
2. All AWS API calls use **their credentials**, not yours
3. All charges go to **their AWS account**, not yours
4. You have **zero financial responsibility** for their usage

---

## 🔐 How Credentials Work

### Current Implementation (Safe for Open Source)

The code uses **local AWS credentials** from the user's environment:

```python
# backend/services/bedrock_service.py
if self.settings.aws_profile and self.settings.aws_profile != "default":
    session = boto3.Session(profile_name=self.settings.aws_profile)
else:
    session = boto3.Session()  # Uses default AWS credentials
```

**This means:**
- ✅ Users must configure their own AWS credentials
- ✅ No hardcoded credentials in the code
- ✅ Each user's AWS account is billed separately
- ✅ You are never charged for their usage

---

## 📋 What Users Need to Do

### Step 1: Get Their Own AWS Account
- Create AWS account at https://aws.amazon.com/
- Request Bedrock model access in their account
- Configure their own AWS credentials

### Step 2: Configure Credentials

**Option A: AWS CLI Profile (Recommended)**
```bash
aws configure --profile wolfir
# Enter their own Access Key ID
# Enter their own Secret Access Key
# Region: us-east-1
```

**Option B: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=their_key
export AWS_SECRET_ACCESS_KEY=their_secret
export AWS_DEFAULT_REGION=us-east-1
```

**Option C: IAM Role (for EC2/ECS)**
- Attach IAM role with permissions
- No credentials needed

### Step 3: Update .env File
```bash
# backend/.env
AWS_REGION=us-east-1
AWS_PROFILE=wolfir  # Their profile name
```

---

## 💵 AWS Costs (Per User)

### What Users Will Pay

**Bedrock (Nova Models):**
- Nova 2 Lite: ~$0.0001 per 1K input tokens, ~$0.0002 per 1K output tokens
- Nova Pro: ~$0.002 per 1K input tokens, ~$0.008 per 1K output tokens
- Nova Micro: ~$0.00005 per 1K tokens
- **Typical incident analysis: $0.01 - $0.10**

**DynamoDB:**
- On-demand pricing: $1.25 per million write units, $0.25 per million read units
- **Typical usage: <$1/month**

**S3:**
- Storage: $0.023 per GB/month
- Requests: $0.0004 per 1K PUT requests
- **Typical usage: <$1/month**

**CloudTrail:**
- Management events: **FREE**
- Data events: $0.10 per 100K events

**Total Estimated Cost Per User:**
- Light usage: **$2-5/month**
- Heavy usage: **$10-20/month**

---

## ⚠️ Important Notes for Open Source

### ✅ Safe Practices (Already Implemented)

1. **No hardcoded credentials** - All credentials come from environment
2. **User-configurable AWS profile** - Each user sets their own
3. **No shared resources** - Each user creates their own S3 buckets and DynamoDB tables
4. **Clear documentation** - Users know they need their own AWS account

### 🔒 Security Best Practices

**For Users:**
- Use IAM users/roles with least privilege (not root account)
- Create dedicated IAM user for wolfir
- Grant only necessary permissions:
  - `bedrock:InvokeModel`
  - `dynamodb:*` (or specific table permissions)
  - `s3:*` (or specific bucket permissions)
  - `cloudtrail:LookupEvents`

**Example IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/secops-incidents"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::secops-lens-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudtrail:LookupEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 📝 Recommended README Addition

Add this section to your README:

```markdown
## 💰 AWS Billing & Costs

**Important**: This project uses your AWS account and credentials. All AWS charges will be billed to **your AWS account**, not the project maintainer.

### What You'll Pay
- **Bedrock (Nova models)**: ~$0.01-0.10 per incident analysis
- **DynamoDB**: ~$1/month for typical usage
- **S3**: ~$1/month for typical usage
- **Total**: ~$2-5/month for light usage

### Setup Your Own AWS Account
1. Create AWS account at https://aws.amazon.com/
2. Request Bedrock model access
3. Configure AWS credentials (see Setup Guide)
4. Create your own S3 buckets and DynamoDB table

**You are responsible for your own AWS costs.**
```

---

## 🎯 Summary

### ✅ You Are Safe
- Users use their own AWS accounts
- You will NOT be charged
- No shared billing
- No hardcoded credentials

### ✅ Users Are Safe
- Clear documentation about costs
- Easy to set up their own account
- Transparent pricing
- Can control their own spending

### ✅ Best Practices
- Always use IAM users/roles (not root)
- Set up billing alerts
- Use least privilege permissions
- Monitor usage in AWS Cost Explorer

---

## 🚨 If You Want Extra Protection

### Add a Startup Warning

You could add this to `backend/main.py`:

```python
@app.on_event("startup")
async def startup_warning():
    """Warn users about AWS billing"""
    logger.warning("=" * 60)
    logger.warning("⚠️  AWS BILLING WARNING")
    logger.warning("=" * 60)
    logger.warning("This application uses YOUR AWS account and credentials.")
    logger.warning("All AWS charges will be billed to YOUR account.")
    logger.warning("You are responsible for monitoring your AWS costs.")
    logger.warning("=" * 60)
```

---

**Bottom Line**: You're completely safe! Each user uses their own AWS account, so you'll never be charged for their usage. 🎉
