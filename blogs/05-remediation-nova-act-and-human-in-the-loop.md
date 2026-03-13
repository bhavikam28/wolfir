# Remediation, Nova Act, and Human-in-the-Loop

wolfir doesn’t just recommend fixes. It can execute them. IAM policy attachment, security group changes, resource tagging — with CloudTrail proof and one-click rollback. Here’s how we balance automation with safety.

## The Remediation Pipeline

1. **Nova 2 Lite** generates remediation steps from the timeline and risk analysis.
2. **Nova Micro** classifies each step: Auto-Execute, Human Approval, or Manual Only.
3. **Remediation Executor** applies approved steps via boto3.
4. **CloudTrail** confirms every action. We store before/after state.
5. **Rollback** — One click to undo.

High-risk actions (e.g., deleting a role) are never auto-executed. Medium-risk (e.g., attaching a deny policy) require explicit approval. Low-risk (e.g., adding a tag) can be auto-executed in demo mode.

## Nova Act: Beyond API

Some fixes aren’t API calls. Creating a JIRA ticket. Opening the AWS Console to a specific page. Nova Act is a browser automation SDK — we use it to generate *plans* for these actions. The user runs them manually (or with Nova Act’s runner if configured).

**Example Nova Act plan:**
1. Navigate to IAM Console → Roles
2. Select `compromised-role`
3. Attach inline policy `wolfir-EmergencyDeny`
4. Create JIRA ticket SEC-123 with remediation summary

We output these as step-by-step instructions. With Nova Act API key, we can also generate executable plans.

## The Challenge: Blast Radius

A remediation step can have unintended effects. Attaching a deny policy to a role might break a running application. We mitigate by:

- **Explicit approval** for anything that modifies IAM, security groups, or networking
- **Before/after snapshots** so the user sees what will change
- **Rollback commands** — we output the exact `aws iam delete-role-policy` (or equivalent) to undo
- **Demo mode** — execution is simulated. No real API calls.

## The Challenge: Idempotency

What if the user runs remediation twice? We check current state before applying. If the policy is already attached, we skip. If the resource is already tagged, we no-op. CloudTrail still gets a record, but we avoid duplicate work.

## Human-in-the-Loop as a Feature

We could auto-execute everything. We don’t. Security decisions need human judgment. A 3am automated fix that takes down production is worse than a 9am manual fix. Our job is to make the manual fix fast — one click, with full context — not to remove the human.

## What’s Next

Nova Act integration is plan-only by default. Full browser automation requires the Nova Act SDK and API key. We’re exploring deeper integration for JIRA and Confluence — generate and create in one flow. For now, copy-paste from our docs works well.
