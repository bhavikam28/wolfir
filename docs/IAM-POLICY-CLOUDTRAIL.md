# IAM Policy for wolfir

wolfir needs the following permissions for full functionality. All permissions are read-only or scoped to wolfir-prefixed resources — no broad write access required.

| Permission | Purpose | When Needed |
|------------|---------|-------------|
| `cloudtrail:LookupEvents`, `ListTrails` | Fetch and verify CloudTrail events | Real AWS analysis, Test Connection |
| `bedrock:InvokeModel`, `ListFoundationModels`, `ListGuardrails` | Nova AI pipeline, guardrails audit | All analysis |
| `dynamodb:PutItem/GetItem/Query/Scan/UpdateItem/DescribeTable/CreateTable` | Cross-incident memory | After each analysis |
| `cloudformation:ListChangeSets/DescribeChangeSet/ListStacks/DescribeStacks` | ChangeSet Analysis tab | Pre-deployment review |
| `iam:ListUsers/ListRoles/ListAccessKeys/SimulatePrincipalPolicy` | Blast Radius Simulator, IAM audit | Incident analysis |
| `organizations:ListAccounts/ListOrganizationalUnitsForParent/DescribeOrganization` | AWS Organizations Dashboard | Multi-account view |

## Full Policy (Recommended — paste this in AWS Console)

1. Open **IAM** → **Users** → select your IAM user
2. **Add permissions** → **Create inline policy** → **JSON** tab
3. Paste this policy (replace `ACCOUNT_ID` with your 12-digit AWS account ID):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "WolfirCloudTrail",
            "Effect": "Allow",
            "Action": [
                "cloudtrail:LookupEvents",
                "cloudtrail:ListTrails",
                "cloudtrail:DescribeTrails"
            ],
            "Resource": "*"
        },
        {
            "Sid": "WolfirBedrock",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
                "bedrock:ListFoundationModels",
                "bedrock:ListGuardrails"
            ],
            "Resource": "*"
        },
        {
            "Sid": "WolfirDynamoDB",
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:UpdateItem",
                "dynamodb:DescribeTable",
                "dynamodb:CreateTable"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/wolfir-*"
        },
        {
            "Sid": "WolfirCloudFormation",
            "Effect": "Allow",
            "Action": [
                "cloudformation:ListChangeSets",
                "cloudformation:DescribeChangeSet",
                "cloudformation:ListStacks",
                "cloudformation:DescribeStacks"
            ],
            "Resource": "*"
        },
        {
            "Sid": "WolfirIAMRead",
            "Effect": "Allow",
            "Action": [
                "iam:ListUsers",
                "iam:ListRoles",
                "iam:ListAccessKeys",
                "iam:SimulatePrincipalPolicy"
            ],
            "Resource": "*"
        },
        {
            "Sid": "WolfirOrganizations",
            "Effect": "Allow",
            "Action": [
                "organizations:ListAccounts",
                "organizations:ListOrganizationalUnitsForParent",
                "organizations:DescribeOrganization",
                "organizations:ListRoots"
            ],
            "Resource": "*"
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
