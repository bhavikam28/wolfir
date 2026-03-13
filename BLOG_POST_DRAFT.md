# wolfir: What Happens When AI Actually Responds to Security Alerts

*Draft for builder.aws.com — use tag Amazon-Nova*

---

## The Gap Nobody Talks About

Security tools are great at detecting. GuardDuty, Security Hub, CloudTrail — they surface the signal. But they don't respond. The gap between "we found something" and "we fixed it" is still filled by humans: manually correlating logs, building timelines, drafting runbooks, and hoping nothing slips through.

We built wolfir to close that gap. Not with another dashboard. With an agentic pipeline that takes CloudTrail events, runs them through seven Amazon Nova models and services, and produces a full incident response package — timeline, attack path, risk scores, remediation plan with AWS CLI commands, and documentation ready for JIRA, Slack, or Confluence.

## Seven Nova Capabilities — Why Each One

We didn't pick models at random. Each one does what it's best at:

| # | Model / Service | Model ID | Usage |
|---|-----------------|----------|-------|
| 1 | **Nova Pro** | `amazon.nova-pro-v1:0` | Visual architecture analysis — reads diagram images, spots misconfigurations |
| 2 | **Nova 2 Lite** | `us.amazon.nova-2-lite-v1:0` | Timeline, remediation, docs, Aria, Strands Agent — fast text reasoning |
| 3 | **Nova Micro** | `amazon.nova-micro-v1:0` | Risk scoring — ultra-fast, deterministic (temp=0.1) |
| 4 | **Nova 2 Sonic** | `amazon.nova-2-sonic-v1:0` | Voice (integration-ready) — WebSocket streaming for Aria |
| 5 | **Nova Canvas** | `amazon.nova-canvas-v1:0` | Report cover art — image generation for incident reports |
| 6 | **Nova Act** | nova-act SDK | Browser automation plans — AWS Console remediation, JIRA ticket creation |
| 7 | **Nova Multimodal Embeddings** | `amazon.nova-2-multimodal-embeddings-v1:0` | Incident similarity — semantic search over incident history |

**Why this mix?** Nova Micro scores risk in under a second. Nova 2 Lite handles the heavy reasoning — timeline, root cause, remediation. Nova Pro reads architecture diagrams. Nova Canvas generates report visuals. Nova Act turns remediation steps into browser automation. Embeddings power "find incidents similar to this one." Throwing one model at everything would be slower and less accurate.

## Architecture: How It All Fits Together

```
CloudTrail Alert
      ↓
┌─────────────────────────────────────────────────┐
│  STRANDS AGENTS SDK — Orchestration Layer        │
├─────────┬──────────┬──────────┬────────┬────────┤
│  Nova   │  Nova 2  │  Nova    │ Orch-  │ Nova 2 │
│  Pro    │  Lite    │  Micro   │ estrator│ Lite   │
│ Detect  │Investigate│ Classify │Remediate│Document│
├─────────┴──────────┴──────────┴────────┴────────┤
│  5 MCP Servers · 23 Tools · 14 Strands @tool     │
└──────────────────────────────────────────────────┘
      ↓              ↓             ↓
  DynamoDB     CloudTrail      JIRA/Slack/
  (Memory)     (Audit Proof)   Confluence
```

The pipeline is deterministic for demos — you see exactly what each agent does. For autonomous queries, the Strands Agent picks its own tools (CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas) based on your prompt. Real agentic behavior.

### Pipeline Flow (Incident Analysis)

```
User selects scenario / connects AWS
         ↓
POST /api/orchestration/analyze-incident
         ↓
┌──────────────────────────────────────────────────────────────┐
│ 1. Temporal Agent (Nova 2 Lite) → Timeline, root cause        │
│ 2. Risk Scorer (Nova Micro)    → Risk 0-100 per event       │
│ 3. Remediation Agent (Nova 2 Lite) → Fix plan + AWS CLI      │
│ 4. Doc Agent (Nova 2 Lite)     → JIRA, Slack, Confluence     │
│ 5. DynamoDB                    → Save incident, correlate   │
└──────────────────────────────────────────────────────────────┘
         ↓
Timeline · Attack Path · Compliance · Cost · Remediation · Docs
```

### MCP Server Architecture

Five AWS MCP servers expose 23 tools that the Strands Agent can call:

| MCP Server | Tools | Purpose |
|------------|-------|---------|
| CloudTrail MCP | Event lookup, anomaly scan | Security event source |
| IAM MCP | User audit, role audit, policy analysis | IAM security checks |
| CloudWatch MCP | Alarms, metrics, billing anomalies | Operational visibility |
| Security Hub MCP | Findings, GuardDuty, Inspector | Unified security view |
| Nova Canvas MCP | Image generation | Report covers, attack visuals |

## Who It's For

We built this for SOC analysts, cloud security engineers, and incident responders. If you're in an AWS organization using IAM Identity Center (SSO), you can connect your profile and run analysis against real CloudTrail data. No keys on our servers. Everything stays in your account.

We also built it for teams that are understaffed. Security teams get 11,000+ alerts per day and investigate less than 5%. wolfir doesn't replace judgment — it gives you a head start. A timeline in seconds instead of 45 minutes. A remediation plan with approval gates instead of a blank page.

## The Differentiators

**Cross-incident memory.** Run two demos. The second one says "78% probability this is the same attacker." We store incident summaries in DynamoDB and correlate by fingerprint. Ask Aria, our voice assistant, "have we seen this before?" and get a real answer.

**Remediation with proof.** We don't just suggest steps — we can execute them. Before/after state, CloudTrail confirmation, one-click rollback. Human-in-the-loop for anything risky.

**AI pipeline self-monitoring.** "Who protects the AI?" We monitor our own Bedrock pipeline for prompt injection, API abuse, and data exfiltration using MITRE ATLAS. Six techniques, real-time. NIST AI RMF aligned.

**Semantic similarity.** Nova Multimodal Embeddings let you find incidents that are semantically similar, not just keyword matches. Click the sparkle icon in Incident History and see what's related.

## What We Learned

Building this taught us a few things. First, model selection matters. Nova Micro for risk scoring is fast and deterministic. Nova 2 Lite for reasoning handles the heavy lifting. Throwing one model at everything would have been slower and less accurate.

Second, agentic behavior is real. When timeline confidence is low, our pipeline runs a CloudTrail anomaly scan before proceeding. It pivots. That's not a script — it's the Strands Agent deciding what to do next.

Third, demo mode had to work without a backend. We built client-side fallbacks so the Vercel deployment runs end-to-end even when the API isn't running. Instant demo, no setup.

## Day 2 and Beyond

Where could this go? Multi-account analysis at scale. Deeper JIRA/Slack integration via Nova Act. Custom playbooks that learn from your incidents. We're open-sourcing the core so others can extend it.

If you're a SOC team drowning in alerts, or a builder curious what agentic AI looks like in security, give wolfir a try. The demo is free. Connect your AWS account when you're ready.

---

*Built with Amazon Nova. #AmazonNova*
