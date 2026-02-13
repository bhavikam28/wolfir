# IAM Policy for Nova Sentinel

The user `secops-lens-pro` needs CloudTrail and Bedrock permissions for full functionality.

| Permission | Purpose | When Needed |
|------------|---------|-------------|
| `cloudtrail:LookupEvents` | Fetch CloudTrail events | Start CloudTrail Analysis |
| `cloudtrail:ListTrails` | Verify CloudTrail access | Test Connection |
| `bedrock:InvokeModel` | Run Nova models for AI analysis | CloudTrail analysis, orchestrator |
| `bedrock:ListFoundationModels` | List available models | Test Connection |

## Option 1: AWS Console (Attach policy to user)

1. Open **IAM** → **Users** → select `secops-lens-pro`
2. **Add permissions** → **Create inline policy** → **JSON** tab
3. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "NovaSentinelCloudTrail",
            "Effect": "Allow",
            "Action": [
                "cloudtrail:LookupEvents",
                "cloudtrail:ListTrails"
            ],
            "Resource": "*"
        },
        {
            "Sid": "NovaSentinelBedrock",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/*",
                "arn:aws:bedrock:us-east-1:ACCOUNT_ID:inference-profile/*"
            ]
        }
    ]
}
```

4. Name it `NovaSentinelFull` (or similar) → **Create policy**

> **If you already have NovaSentinelCloudTrail:** Add a second inline policy with just the Bedrock statement above, or edit the existing policy to include both.

## Option 2: AWS CLI (inline policy — add Bedrock to existing user)

If you already have CloudTrail permissions, add **Bedrock** with:

```bash
aws iam put-user-policy \
  --user-name secops-lens-pro \
  --policy-name NovaSentinelBedrock \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:ListFoundationModels"],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/*"
    }]
  }'
```

## Option 3: Full policy (CloudTrail + Bedrock) via CLI

```bash
aws iam put-user-policy \
  --user-name secops-lens-pro \
  --policy-name NovaSentinelFull \
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
        "Action": ["bedrock:InvokeModel", "bedrock:ListFoundationModels"],
        "Resource": "arn:aws:bedrock:us-east-1::foundation-model/*"
      }
    ]
  }'
```

## After Adding the Policy

1. **Wait ~30 seconds** for IAM changes to propagate
2. **Refresh credentials** if using temporary/session credentials: run `aws login` again
3. Click **Start CloudTrail Analysis** again in Nova Sentinel

## Other Requirements

- **CloudTrail must be enabled** in your account. Enable it in: CloudTrail → Trails → Create trail (or use the default management-events trail).
- **Bedrock model access**: In **Bedrock** → **Model access** (left sidebar), request access to Nova models (e.g. Amazon Nova Lite, Nova Pro). IAM allows the API call, but model access must be enabled per-account.
- **Region**: Uses the region from your profile/config (e.g. `us-east-1`). Use `us-east-1` in the policy `Resource` if your app runs there.
