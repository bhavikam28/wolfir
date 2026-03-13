# Real AWS vs. Demo Mode: How wolfir Works With and Without Your Account

wolfir has two modes: **Demo** (no AWS) and **Console** (real AWS). Both use the same UI and pipeline. The difference is where the data comes from.

## Demo Mode: Zero Setup

Click “Try Demo,” pick a scenario (Crypto Mining, IAM Privilege Escalation, Data Exfiltration, etc.), and the pipeline runs with sample data. No AWS account. No credentials. The frontend can even work when the backend is offline — we built client-side fallbacks so the Vercel deployment runs end-to-end.

**What you get:**
- Full 5-agent pipeline (Detect → Investigate → Classify → Remediate → Document)
- Timeline, attack path, compliance mapping, cost impact
- Aria voice assistant
- Report export (PDF, clipboard, print)
- Nova Act remediation plans (plan-only when backend is offline)

**Limitation:** Sample data. No real CloudTrail, no real IAM. It’s a preview of the product.

## Console Mode: Real AWS

Connect via AWS CLI profile or SSO. Credentials stay on your machine — we never store or transmit them. The backend reads from `~/.aws/credentials` and makes AWS API calls directly.

**What you get:**
- Real CloudTrail events from 12 regions (configurable)
- Real IAM analysis (users, roles, policies)
- Security Hub findings (if enabled)
- Cross-incident memory (DynamoDB) — “have we seen this attacker before?”
- One-click remediation (with approval)
- Agentic Query against live AWS data

**Requirements:**
- IAM permissions: CloudTrail (LookupEvents), Bedrock (InvokeModel), DynamoDB (PutItem, Query)
- Bedrock enabled in your account
- See [docs/AWS_SETUP.md](../docs/AWS_SETUP.md) for setup

## The Challenge: Bridging Both

We wanted demo mode to feel identical to real mode. Same tabs, same flow. The only difference: data source. That meant:

1. **Unified API contract** — Same response shapes for demo and real. The frontend doesn’t branch.
2. **Graceful degradation** — If the backend is unreachable, demo mode still works with client-side data.
3. **Clear indicators** — “Demo Mode” vs. “Live AWS Analysis” in the UI. No confusion.

## Credential Security

We take this seriously. Credentials are read locally. No proxy. No storage. If you revoke your AWS profile, we stop working. That’s by design.

## When to Use Which

- **Evaluating the product?** Demo mode. No setup.
- **Analyzing your environment?** Connect AWS. One-time config, then you’re live.
