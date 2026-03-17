# wolfir

**AI that secures your cloud — and secures itself. Powered by Amazon Nova.**

> The only cloud security platform that also watches itself. **7 Amazon Nova capabilities** detect, investigate, classify, remediate, and document cloud threats — while monitoring the AI pipeline against MITRE ATLAS in real time. Built for SOC analysts and AI security teams. Cloud security + AI security, one platform.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-wolfir.vercel.app-22d3ee)](https://wolfir.vercel.app)
[![Demo Video](https://img.shields.io/badge/Demo%20Video-YouTube-red)](https://www.youtube.com/watch?v=K8tzqR4ElU8)
[![GitHub](https://img.shields.io/badge/Source-GitHub-181717)](https://github.com/bhavikam28/wolfir)

---

## Demo Video

[![wolfir Demo Video](https://img.youtube.com/vi/K8tzqR4ElU8/maxresdefault.jpg)](https://www.youtube.com/watch?v=K8tzqR4ElU8)

> The [live Vercel demo](https://wolfir.vercel.app) runs in **instant client-side simulation** mode with pre-computed real Nova outputs — no AWS setup needed. For the **full Nova AI pipeline** (5 agents, MITRE ATLAS, Agentic Query, real CloudTrail), run the backend locally: `cd backend && uvicorn main:app --reload`.

---

## Motivation

Security teams receive **960+ alerts per day** on average, and **40% go uninvestigated** (Prophet Security, AI in SOC Survey, 2025). Manual correlation, triage, and remediation take hours — often at 2am. Existing tools detect; they don't respond. I built wolfir to close that gap: from alert to remediation plan to documentation, autonomously, with human-in-the-loop approval for risky actions.

But there was a second problem nobody was solving: every modern security platform now uses AI, but nobody is securing the AI itself. MITRE ATLAS has catalogued these threats. Who's monitoring them in production? For most teams, the answer is nobody. wolfir does — it monitors its own Bedrock pipeline in real time.

**Why I chose this path:**
- **Multi-model specialization** — One model can't do everything well. Nova Pro reads diagrams. Nova Micro scores risk in under 1 second. Nova 2 Lite reasons over timelines. Each does what it's best at.
- **Agentic over static** — An AI that picks its own tools (CloudTrail, IAM, Security Hub) and plans its own queries, not a fixed workflow.
- **Action, not just insight** — Remediation plans with one-click apply, CloudTrail proof, and rollback. Nova Act for AWS Console and JIRA automation.
- **Who protects the AI?** — MITRE ATLAS monitoring on the live Bedrock pipeline. wolfir watches itself.

## Why "wolfir"?

**wolf** + **ir** (Incident Response). A wolf hunts in a pack — coordinated, precise, relentless. The multi-agent pipeline works the same way: 7 Nova capabilities, each with a role, sharing state, moving from signal to resolution. The name signals both the hunt (finding threats) and the pack (multi-agent orchestration).

## What is wolfir?

wolfir is an **autonomous security platform** that closes two gaps:

1. **Cloud security** — Incident response: detect, investigate, classify, remediate, document. CloudTrail events flow in; a five-agent Nova pipeline produces a complete Security Response Package with timeline, attack path, remediation, and documentation.

2. **AI security** — wolfir monitors its own Bedrock pipeline with MITRE ATLAS (6 techniques), OWASP LLM Top 10, Shadow AI detection, and EU AI Act / NIST AI RMF compliance readiness. When you use AI to defend your cloud, wolfir defends the AI.

**This is not a dashboard or SIEM.** It is an autonomous multi-agent system that takes action and watches itself.

---

## Features

| Feature | Description |
|---------|-------------|
| **5-Agent Nova Pipeline** | Detect → Investigate → Classify → Remediate → Document. Context pruned at every handoff — 40K tokens reduced to ~12K per run. |
| **Security Posture Dashboard** | Incident overview with health score, risk distribution by severity, key metrics, and top findings ranked by impact. |
| **Attack Path Diagram** | Interactive React Flow graph tracing threat propagation across AWS resources — every node is clickable with MITRE technique, source IP, and timestamp. |
| **Blast Radius Simulator** | Given the affected IAM identity, maps every AWS resource reachable via IAM policy simulation. Results tiered CRITICAL / HIGH / MEDIUM / LOW with financial impact per resource. |
| **AWS Organizations Dashboard** | Full org tree (Management Account → OUs → Member Accounts), cross-account lateral movement detection, SCP gap analysis, account-level threat indicators. |
| **Compliance Mapping** | CIS AWS Foundations, NIST 800-53 rev5, SOC 2 Type II, PCI-DSS v4.0, SOX IT Controls, HIPAA — every finding auto-mapped to specific control IDs. |
| **Cost Impact Analysis** | Financial exposure using the IBM Cost of Data Breach 2024 methodology. Direct compute cost, per-PII-record exposure, IR labor, and regulatory fine ranges (GDPR, CCPA, HIPAA). |
| **Autonomous Remediation** | Real executable AWS CLI commands with three-tier approval: AUTO (executes immediately), APPROVAL (requires sign-off), MANUAL (CLI for analyst). Before/after state snapshots and one-click rollback for every step. |
| **ChangeSet Analysis** | CloudFormation ChangeSet pre-deployment risk assessment — IAM policy changes, security group modifications, S3 configuration, encryption changes, network topology. |
| **IR Protocol Adherence** | NIST IR phase compliance scoring (Preparation, Detection, Containment, Eradication, Recovery, Post-Incident) with gap identification. |
| **SLA Tracker** | Real-time P1/P2 SLA monitoring with breach prediction based on pipeline stage and historical resolution time. |
| **Incident History** | Persistent cross-incident memory dashboard — view all past findings, behavioral fingerprints, correlation scores, and campaign-level clustering. |
| **Report Export** | PDF incident report generated with Nova Canvas cover art specific to each incident type. Includes timeline, compliance mapping, and remediation log. |
| **Agentic Query** | Autonomous Strands Agent with 19 registered tools across 6 AWS MCP servers — asks free-text questions, plans its own investigation, executes multi-step workflows. Extended thinking enabled. |
| **Security Health Check** | Proactive posture assessment without an incident — 5 autonomous agent queries against live AWS environment (IAM, CloudTrail, CloudWatch, Security Hub). |
| **AI Pipeline Security** | MITRE ATLAS runtime monitoring (6 techniques), OWASP LLM Top 10 posture radar, Shadow AI detection, NIST AI RMF alignment, EU AI Act readiness, AI-BOM export, Bedrock Guardrails audit. |
| **Visual Architecture Analysis** | Upload a PNG/JPG architecture diagram — Nova Pro performs STRIDE threat assessment (50+ check types) in under 30 seconds. |
| **Voice Assistant — Aria** | Nova 2 Sonic speech-to-speech streaming. Ask "What happened in the last 24 hours?" and receive spoken incident analysis. Hands-free SOC investigation. |
| **Cross-Incident Memory** | Every incident stored in DynamoDB with SHA-256 behavioral fingerprints, MITRE technique overlap, IOC matching, and 384-dimension Nova Embeddings cosine similarity. |
| **Real AWS Mode** | Connect via AWS CLI profile — credentials stay local, never transmitted. Analyzes live CloudTrail events from any configured AWS account. |
| **Demo Scenarios** | 3 pre-computed scenarios using real Nova pipeline outputs: IAM Privilege Escalation, AWS Organizations Cross-Account Breach, Shadow AI / Ungoverned LLM Use. |

---

## Architecture

### System Overview

![wolfir Architecture Overview](docs/images/architecture-overview.png)

*Full system: inputs, multi-agent pipeline, 7 Nova capabilities, 6 MCP servers, incident response package, and AI security pillar — all connected.*

### 5-Stage Incident Response Pipeline

![wolfir Pipeline Architecture](docs/images/pipeline-architecture.png)

*CloudTrail events → Temporal Analysis (Nova 2 Lite) → Risk Scoring (Nova Micro x3 parallel) → Remediation Plan (Nova 2 Lite) → Documentation (Nova 2 Lite + Nova Canvas) → Save & Correlate (DynamoDB + Nova Embeddings). Context pruned to ~800 tokens at each handoff. Total: 30–45s end-to-end.*

### Scalability Architecture (Production Path)

```
                    ┌────────────────────────────┐
                    │  CloudTrail / GuardDuty     │
                    │  (960+ alerts/day avg)      │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   AWS SQS (Alert Queue)    │
                    │   FIFO · DLQ · 14-day TTL  │
                    └──┬───────────┬──────────┬──┘
                       │           │           │
          ┌────────────▼──┐ ┌──────▼──────┐ ┌─▼────────────┐
          │ wolfir Worker  │ │wolfir Worker│ │wolfir Worker  │
          │  (ECS Fargate) │ │(ECS Fargate)│ │(ECS Fargate)  │
          │ Priority: HIGH │ │Priority: MED│ │Priority: LOW  │
          └──────┬─────────┘ └──────┬──────┘ └──────┬────────┘
                 │                  │                │
          ┌──────▼──────────────────▼────────────────▼───────┐
          │       Strands Agents Orchestration Layer          │
          │  Nova Pro · Nova 2 Lite · Nova Micro · Nova Act   │
          │         6 MCP Servers · 27 MCP Tools              │
          └────────────────────────┬──────────────────────────┘
                                   │
          ┌────────────────────────▼──────────────────────────┐
          │            DynamoDB Global Tables                  │
          │   Cross-region incident memory & correlation       │
          │   us-east-1 · us-west-2 · ap-southeast-1          │
          └────────────────────────────────────────────────────┘
```

---

## Key Differentiators

### 1. AI Security Self-Monitoring (MITRE ATLAS)
wolfir monitors its own Bedrock pipeline against 6 MITRE ATLAS techniques in real time as every analysis runs. Running an incident analysis simultaneously updates the AI security posture dashboard — the two pillars share a live data plane. This is not an add-on.

### 2. Blast Radius Simulator
Given any affected IAM identity from an incident, wolfir maps every AWS service, resource, and data store reachable via IAM policy simulation. Turns "we had an IAM incident" into "here is exactly what was at risk and what to restrict first."

### 3. AWS Organizations Multi-Account View
Full org tree visualization (Management Account → OUs → Member Accounts), cross-account lateral movement detection, SCP gap analysis, and account-level security posture scores — from a single wolfir console.

### 4. Cross-Incident Memory (DynamoDB + Nova Embeddings)
Persistent behavioral correlation across incidents using four signals: SHA-256 fingerprint, MITRE technique overlap, IOC matching, and cosine similarity via Nova Multimodal Embeddings (384 dimensions). Run two demo scenarios and wolfir surfaces "78% probability — same external entity."

### 5. Autonomous Remediation with Proof
Executes real AWS API calls — not just suggestions. Before/after state snapshots, CloudTrail confirmation of every action, one-click rollback for every executed step.

---

## Nova Models Used — 7 Capabilities

wolfir uses 7 Amazon Nova capabilities — each chosen for what it does best, not interchangeable:

| # | Model | Model ID | Role |
|---|-------|----------|------|
| 1 | **Nova Pro** | `amazon.nova-pro-v1:0` | Visual STRIDE threat modeling on uploaded architecture diagrams. The only multimodal Nova — text models cannot read a VPC diagram. |
| 2 | **Nova 2 Lite** | `us.amazon.nova-2-lite-v1:0` | Timeline reconstruction, remediation plan generation, documentation (JIRA, Slack, Confluence), Aria assistant responses, Strands Agent orchestration. |
| 3 | **Nova Micro** | `amazon.nova-micro-v1:0` | Per-event risk classification at `temperature=0.1` for determinism. Three parallel calls via `asyncio.gather()` produce confidence interval output (e.g. `77/100, CI: 70–84`). |
| 4 | **Nova 2 Sonic** | `amazon.nova-2-sonic-v1:0` | Aria voice assistant — WebSocket speech-to-speech streaming. Not TTS bolted onto an LLM. |
| 5 | **Nova Canvas** | `amazon.nova-canvas-v1:0` | Incident-specific PDF report cover art — each incident type gets a distinct generated image. |
| 6 | **Nova Act** | nova-act SDK | Executable browser automation plans for AWS Console remediation navigation and JIRA ticket creation. Generates actions, not just instructions. |
| 7 | **Nova Multimodal Embeddings** | `amazon.nova-2-multimodal-embeddings-v1:0` | 384-dimensional behavioral vectors stored in DynamoDB for cross-incident semantic similarity search. Finds campaigns described differently each time. |

**Why this mix:** Nova Micro is faster and more deterministic than Nova 2 Lite for classification. Nova Pro is the only model that can read an uploaded architecture diagram. Nova Embeddings finds behavioral similarity that fingerprint matching alone misses. Using one model for all of this would produce slower, less accurate, context-bound results.

---

## AWS Services

| Service | Usage |
|---------|-------|
| **Amazon Bedrock** | All Nova model invocations |
| **DynamoDB** | Cross-incident memory, behavioral correlation, incident history (PAY_PER_REQUEST, auto-table-creation) |
| **CloudTrail** | Security event source and audit proof for every remediation action |
| **IAM** | Policy analysis, Blast Radius simulation, remediation execution |
| **CloudWatch** | Anomaly detection, billing anomaly monitoring |
| **S3** | Architecture diagram storage, Bedrock Knowledge Base playbook source |
| **Bedrock Knowledge Base** | RAG-powered playbook retrieval (S3 Vectors) |
| **Bedrock Guardrails** | Content filtering, prompt attack blocking, PII masking on all inference |
| **AWS Organizations** | Multi-account org tree, SCP analysis, cross-account correlation |
| **STS** | AssumeRole chain analysis, session management |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI, uvicorn, Strands Agents SDK, boto3 |
| **Agent framework** | Strands Agents SDK — 6 MCP servers, 19 Strands tools, FastMCP |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Framer Motion, React Flow |
| **Infrastructure** | Terraform (S3 + Bedrock Knowledge Base), Docker + docker-compose |
| **Deployment** | Vercel (frontend), Docker / ECS Fargate (backend) |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- AWS credentials configured (`aws configure`)

### IAM Permissions

| Service | Actions | Purpose |
|---------|---------|---------|
| **CloudTrail** | `LookupEvents`, `ListTrails` | Real AWS analysis |
| **Bedrock** | `InvokeModel`, `ListFoundationModels` | Nova AI pipeline |
| **DynamoDB** | `PutItem`, `GetItem`, `Query`, `DescribeTable`, `CreateTable` | Cross-incident memory |
| **Organizations** | `ListAccounts`, `ListOrganizationalUnitsForParent`, `DescribeOrganization` | Multi-account dashboard |

See **[docs/IAM-POLICY-CLOUDTRAIL.md](docs/IAM-POLICY-CLOUDTRAIL.md)** for exact JSON policies and step-by-step setup.

### Option 1: Docker (recommended)

```bash
git clone https://github.com/bhavikam28/wolfir
cd wolfir
cp .env.example .env   # set AWS_REGION and optionally KNOWLEDGE_BASE_ID
docker compose up
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
```

### Option 2: Manual

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Optional: Bedrock Knowledge Base (RAG Playbooks)

wolfir works fully without a Knowledge Base. For enhanced playbook retrieval in Agentic Query:

```bash
cd terraform && terraform init && terraform apply
# Then create a Bedrock Knowledge Base in the console (S3 Vectors, Quick create)
# Connect to the Terraform-created bucket, sync, and set KNOWLEDGE_BASE_ID in .env
```

See [terraform/README.md](terraform/README.md) for step-by-step instructions.

---

## Demo Flow (No AWS Account Required)

> **wolfir.vercel.app** runs in instant demo mode — no backend or AWS account needed. All demo scenarios work fully client-side.
> **Real AWS analysis** requires the backend running locally. Use `http://localhost:5173` (not the Vercel link) — see [Real AWS Analysis](#real-aws-analysis) below.

1. Open [wolfir.vercel.app](https://wolfir.vercel.app) (demo mode) or `http://localhost:5173` (with local backend)
2. Click **Try Demo Free** → **Scenario Picker**
3. Select one of three scenarios:
   - **IAM Privilege Escalation** — Contractor misuses an AssumeRole chain to gain AdministratorAccess. MITRE T1098, T1078. 9 events. CRITICAL.
   - **AWS Organizations Cross-Account Breach** — Affected Dev account role pivots via STS into Production and Security accounts across 3 OUs and 12 member accounts. 18 events. CRITICAL.
   - **Shadow AI / Ungoverned LLM Use** — Ungoverned Bedrock InvokeModel calls with a prompt injection attempt. Exercises the MITRE ATLAS self-monitoring pipeline. 7 events. CRITICAL.
4. Watch the 5-agent pipeline execute with per-step model labels
5. Explore every analysis tab:
   - **Security Posture** → health score, risk distribution, top findings
   - **Timeline** → forensic event chain with root cause
   - **Attack Path** → React Flow graph, click any node for full event detail
   - **Blast Radius** → every AWS resource reachable from the affected identity
   - **Compliance** → CIS, NIST 800-53, SOC 2, PCI-DSS, SOX, HIPAA auto-mapped
   - **Cost Impact** → financial exposure with IBM formula
   - **Remediation** → AUTO / APPROVAL / MANUAL tiers with one-click apply
   - **SLA Tracker** → P1/P2 countdown with breach prediction
   - **IR Protocol** → NIST IR phase scoring
   - **AI Security** → MITRE ATLAS live posture (wolfir watching itself)
   - **Report Export** → PDF with Nova Canvas cover art
6. **Cross-incident correlation**: run Scenario 1, then Scenario 3 — wolfir surfaces "78% probability — same external entity"
7. **Agentic Query** → free-text questions: "What IAM permissions were used?", "Which controls failed?"
8. **Aria** → voice assistant: "What is the root cause?" "Have we seen this pattern before?"
9. **Organizations Dashboard** → multi-account org tree, cross-account threats, SCP gaps
10. **Incident History** → all past findings, behavioral correlations, campaign clustering

### Real AWS Analysis

> **Important:** Use `http://localhost:5173` — not `wolfir.vercel.app` — for real AWS analysis. Chrome's Private Network Access policy blocks public HTTPS sites from calling localhost backends. The local frontend has no such restriction.

1. Configure credentials: `aws configure --profile wolfir` (see [docs/AWS_SETUP.md](docs/AWS_SETUP.md))
2. Start the backend: `cd backend && uvicorn main:app --reload`
3. Start the frontend: `cd frontend && npm run dev`
4. Open `http://localhost:5173` in your browser
5. Click **Launch Console** → **Real AWS Account** tab → **Test AWS Connection** → **Analyze Real CloudTrail Events**

---

## Performance

| Metric | Value |
|--------|-------|
| Demo mode latency | ~2 seconds (pre-computed real Nova outputs) |
| Full pipeline (real AWS) | 30–45 seconds end-to-end |
| Token usage per run | ~12K (vs ~40K naive — 70% reduction via context pruning) |
| Cost per incident | ~$0.013 |
| MITRE ATT&CK techniques mapped | T1078, T1098, T1059, T1496, T1530 |
| MITRE ATLAS techniques monitored | 6 (AML.T0051, T0016, T0040, T0043, T0024, T0048) |
| Compliance frameworks | CIS AWS Foundations, NIST 800-53, SOC 2, PCI-DSS, SOX, HIPAA |

**Cost derivation:** Typical incident — 5 Nova calls. Nova 2 Lite: ~4K tokens in, ~1K out ≈ $0.001/call. Nova Micro ≈ $0.0002/call. Total ≈ $0.005–0.015 on Bedrock on-demand (us-east-1). See [BILLING_AND_OPEN_SOURCE.md](BILLING_AND_OPEN_SOURCE.md) for full breakdown.

---

## Security

- **Credentials** — Never stored. Local AWS CLI profile only. Explicit `del credentials` immediately after `sts.get_caller_identity()` validation. No long-lived keys in wolfir.
- **Demo mode** — Complete client-side operation; no AWS connection required. Demo outputs are real Nova model outputs from pre-computed pipeline runs, not fabricated data.
- **CloudTrail audit proof** — Every remediation action is logged and verifiable via CloudTrail.
- **Rate limiting** — 60 requests/minute per IP (SlowAPI).
- **Input sanitization** — 500-event cap, 5MB request body max, JSON schema validated before processing.
- **Agentic Query guardrails** — MITRE ATLAS AML.T0051 input scanning + Bedrock Guardrails on all inference. Status visible in the AI Security dashboard — not decoration.
- **Blast Radius** — Read-only IAM simulation. Evaluates policy permissions without executing any actions.

---

## AWS Billing

This project uses your AWS account and credentials. All AWS charges are billed to your account.

- Each user configures their own AWS credentials
- Estimated cost: ~$2–5/month for light usage
- See [BILLING_AND_OPEN_SOURCE.md](BILLING_AND_OPEN_SOURCE.md) for full details

---

## Testing

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

---

## Blog Posts

Technical deep-dives on wolfir's architecture and engineering decisions (also at [wolfir.vercel.app](https://wolfir.vercel.app/#blog)):

- [01 — wolfir Project Overview: Why Seven Nova Capabilities](blogs/01-wolfir-project-overview.md)
- [02 — Multi-Agent Orchestration: The Problems Nobody Warned About](blogs/02-multi-agent-orchestration-challenges.md)
- [03 — AI Pipeline Security & MITRE ATLAS](blogs/03-ai-pipeline-security-mitre-atlas.md)
- [04 — Real AWS vs. Demo Mode: Building Two-Mode Parity](blogs/04-real-aws-vs-demo-mode.md)
- [05 — Remediation, Nova Act & Human-in-the-Loop](blogs/05-remediation-nova-act-and-human-in-the-loop.md)
- [06 — The Bugs That Taught Me Everything](https://wolfir.vercel.app/#blog/06)
- [07 — Why I Chose Each Amazon Nova Model](https://wolfir.vercel.app/#blog/07)

---

**Live demo:** [wolfir.vercel.app](https://wolfir.vercel.app) · **Source:** [github.com/bhavikam28/wolfir](https://github.com/bhavikam28/wolfir) · **Built with:** Amazon Nova · Strands Agents SDK · FastAPI · React · DynamoDB · Terraform
