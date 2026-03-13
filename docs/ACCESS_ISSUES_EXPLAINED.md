# Access Issues Explained

## What Happened

The terminal log shows:

```
AccessDeniedException when calling the GetFindings operation: 
User: arn:aws:iam::155610685000:user/secops-lens-pro is not authorized to perform: 
securityhub:GetFindings on resource: arn:aws:securityhub:us-east-1:155610685000:hub/default 
because no identity-based policy allows the securityhub:GetFindings action
```

## What This Means

The IAM user `secops-lens-pro` in account `155610685000` does **not** have permission to call `securityhub:GetFindings`. Security Hub is an AWS service that aggregates findings from GuardDuty, Inspector, and other security tools.

## Why This Can Happen

1. **Intentional restriction** — The account may be a security operations account with limited permissions for defense-in-depth.
2. **Security Hub not enabled** — Security Hub might not be enabled in the account.
3. **Least-privilege design** — The IAM policy for `secops-lens-pro` was created without Security Hub access.

## How to Fix (If You Want Security Hub Access)

Add a policy that allows Security Hub read access. Example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "securityhub:GetFindings",
        "securityhub:GetInsights",
        "securityhub:ListFindings"
      ],
      "Resource": "*"
    }
  ]
}
```

Or attach the AWS managed policy `AWSSecurityHubReadOnlyAccess` to the `secops-lens-pro` user.

## wolfir Behavior

wolfir handles this gracefully: when Security Hub returns an access error, the agent reports it as a finding ("Limited Security Visibility") and continues with other checks (CloudTrail, IAM, etc.). The analysis still completes; Security Hub findings are simply not included.
