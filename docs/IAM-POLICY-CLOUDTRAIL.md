# IAM Policy for wolfir

The user `secops-lens-pro` needs CloudTrail, Bedrock, and DynamoDB permissions for full functionality.

| Permission | Purpose | When Needed |
|------------|---------|-------------|
| `cloudtrail:LookupEvents` | Fetch CloudTrail events | Start CloudTrail Analysis |
| `cloudtrail:ListTrails` | Verify CloudTrail access | Test Connection |
| `bedrock:InvokeModel` | Run Nova models for AI analysis | CloudTrail analysis, orchestrator |
| `bedrock:ListFoundationModels` | List available models | Test Connection |
| `bedrock:ListGuardrails` | List guardrails for AI Pipeline tab | Optional — Guardrails discovery |
| `dynamodb:PutItem`, `GetItem`, `Query`, `DescribeTable`, `CreateTable` | Cross-Incident Memory | After each analysis |

## Option 1: AWS Console (Attach policy to user)

1. Open **IAM** → **Users** → select `secops-lens-pro`
2. **Add permissions** → **Create inline policy** → **JSON** tab
3. Paste this policy (replace `ACCOUNT_ID` with your AWS account ID, e.g. `155610685000`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "WolfirCloudTrail",
            "Effect": "Allow",
            "Action": [
                "cloudtrail:LookupEvents",
                "cloudtrail:ListTrails"
            ],
            "Resource": "*"
        },
        {
            "Sid": "WolfirBedrock",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels",
                "bedrock:ListGuardrails"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/*",
                "arn:aws:bedrock:us-east-1:ACCOUNT_ID:inference-profile/*",
                "*"
            ]
        },
        {
            "Sid": "WolfirDynamoDB",
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:DescribeTable",
                "dynamodb:CreateTable"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/wolfir-incident-memory"
        }
    ]
}
```

4. Name it `WolfirFull` (or similar) → **Create policy**

> **If you already have WolfirCloudTrail:** Add a second inline policy with just the Bedrock statement above, or edit the existing policy to include both.

## Option 2a: Add DynamoDB only (fix "AccessDeniedException" for Cross-Incident Memory)

If you see `DynamoDB save failed... dynamodb:PutItem... not authorized`, add DynamoDB permissions:

```bash
aws iam put-user-policy \
  --user-name secops-lens-pro \
  --policy-name WolfirDynamoDB \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:DescribeTable",
        "dynamodb:CreateTable"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:155610685000:table/wolfir-incident-memory"
    }]
  }'
```

Replace `155610685000` with your AWS account ID.

**Verify:** In IAM → Users → secops-lens-pro → Permissions, you should see `WolfirDynamoDB` (or 3 policies if adding to existing: WolfirCloudTrail, SecOpsLensPro BedrockAccess, WolfirDynamoDB). Wait 30–60 seconds for IAM to propagate, then retry.

## Option 2b: AWS CLI (inline policy — add Bedrock to existing user)

If you already have CloudTrail permissions, add **Bedrock** with:

```bash
aws iam put-user-policy \
  --user-name secops-lens-pro \
  --policy-name WolfirBedrock \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["bedrock:InvokeModel", "bedrock:ListFoundationModels"],
        "Resource": "arn:aws:bedrock:us-east-1::foundation-model/*"
      },
      {
        "Effect": "Allow",
        "Action": "bedrock:ListGuardrails",
        "Resource": "*"
      }
    ]
  }'
```

## Option 3: Full policy (CloudTrail + Bedrock + DynamoDB) via CLI

Replace `155610685000` with your AWS account ID:

```bash
aws iam put-user-policy \
  --user-name secops-lens-pro \
  --policy-name WolfirFull \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["cloudtrail:LookupEvents", "cloudtrail:ListTrails"],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": ["bedrock:InvokeModel", "bedrock:ListFoundationModels", "bedrock:ListGuardrails"],
        "Resource": ["arn:aws:bedrock:us-east-1::foundation-model/*", "*"]
      },
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:DescribeTable",
          "dynamodb:CreateTable"
        ],
        "Resource": "arn:aws:dynamodb:us-east-1:155610685000:table/wolfir-incident-memory"
      }
    ]
  }'
```

## Optional: Restrict by Source IP (Production)

For production, add IAM conditions to limit where API calls can originate:

```json
"Condition": {
  "IpAddress": {
    "aws:SourceIp": ["YOUR_OFFICE_IP/32", "YOUR_VPN_CIDR"]
  }
}
```

Add this `Condition` block to each Statement to restrict CloudTrail, Bedrock, and DynamoDB calls to trusted IPs. Omit for development or when IPs vary.

## After Adding the Policy

1. **Wait ~30 seconds** for IAM changes to propagate
2. **Refresh credentials** if using temporary/session credentials: run `aws login` again
3. Click **Start CloudTrail Analysis** again in wolfir

## Other Requirements

- **CloudTrail must be enabled** in your account. Enable it in: CloudTrail → Trails → Create trail (or use the default management-events trail).
- **Bedrock model access**: In **Bedrock** → **Model access** (left sidebar), request access to Nova models (e.g. Amazon Nova Lite, Nova Pro). IAM allows the API call, but model access must be enabled per-account.
- **Region**: Uses the region from your profile/config (e.g. `us-east-1`). Use `us-east-1` in the policy `Resource` if your app runs there.
- **CloudTrail regions**: wolfir queries 12 regions by default (US, EU, Asia-Pacific). Set `CLOUDTRAIL_REGIONS=us-east-1,ap-northeast-1` to limit or customize.
