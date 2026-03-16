# wolfir: The AI Security Platform That Watches Itself

*Seven Amazon Nova capabilities, Strands Agents SDK, and MITRE ATLAS self-monitoring — every architectural decision explained.*

---

## The Problem

Every security platform today runs on AI. GuardDuty uses ML for behavioral anomaly detection. Security Hub correlates findings from Inspector, Macie, and dozens of partner tools. IAM Access Analyzer flags overly permissive policies. The signal infrastructure AWS has built is genuinely exceptional.

But I kept asking myself one question while building wolfir: *what happens when someone targets the AI itself?*

If an external entity can embed instructions into the data my models process, misuse my Bedrock inference API, flag runaway invocations, or extract private account patterns through model outputs — my security tool becomes the exposure surface. MITRE built the ATLAS framework specifically to catalogue AI and ML system weaknesses. Most production teams do not deploy any monitoring against it.

There is a second gap. Prophet Security's 2025 AI in SOC Survey puts the average SOC at 960+ alerts per day, with 40% going completely uninvestigated. The problem is not detection. It is the time cost of turning detection into action — correlating events, building a timeline, figuring out root cause, mapping the blast radius, writing a remediation plan with real AWS CLI commands, and documenting everything for the team. That part is still almost entirely manual.

wolfir exists to close both gaps at once: **cloud security and AI security, one platform, where each pillar watches the other.**

---

### System Architecture

### Why "wolfir"?

**wolf + IR** (Security Response). A wolf hunts in a pack — coordinated, each member with a role, sharing context, moving from signal to resolution together. That is exactly how the multi-agent pipeline works: seven Nova capabilities, each specialized, sharing structured state, going from raw CloudTrail events to a complete security response package.

---

## What wolfir Does

wolfir is an autonomous security platform for AWS built on two architecturally connected pillars.

### Pillar 1 — Cloud Security, End to End

CloudTrail events flow in — from a live AWS account or one of three demo scenarios — and a five-agent Nova pipeline fires: Detect → Investigate → Classify → Remediate → Document. The output is a complete Security Response Package:

- **Forensic event timeline** with root cause and event chain analysis
- **Interactive event path diagram** — a React Flow graph where every event is a clickable node showing severity score, MITRE Framework technique, source IP, timestamp, and the IAM control that would have flagged it
- **Blast Radius Simulator** — given the affected identity, runs IAM policy simulation to map every AWS service, resource, and data store reachable from that identity, tiered by severity with financial impact per resource
- **AWS Organizations Dashboard** — full org tree with real-time severity level indicators, cross-account cross-resource movement detection, and SCP gap analysis across OUs
- **Per-event severity scores** with MITRE Framework technique mapping and confidence intervals
- **Compliance mapping** across CIS AWS Foundations, NIST 800-53, SOC 2 Type II, PCI-DSS v4.0, SOX IT Controls, and HIPAA — each finding mapped to specific control IDs automatically
- **Cost impact** using the IBM Cost of Data Exposure 2024 methodology — direct compute cost, data exposure per record, security response labor, and regulatory fine exposure across GDPR, CCPA, HIPAA
- **Remediation plan** with real, executable AWS CLI commands, three-tier human-in-the-loop approval gates, before/after state snapshots, and one-click rollback
- **Documentation** ready for JIRA tickets, Slack alerts, and Confluence postmortems
- **SLA Tracker** — P1/P2 security response SLA monitoring with real-time countdown and SLA miss prediction
- **ChangeSet Analysis** — CloudFormation change severity assessment before deployment, rated by severity tier and mapped to compliance controls
- **Cross-event memory** — every finding persisted to DynamoDB with behavioral fingerprints; Nova Embeddings compute semantic similarity on every new finding against all past ones

Run demo scenario 1 then scenario 2 and wolfir surfaces: *"78% probability this is the same external entity"* — overlapping IP range, similar IAM enumeration sequence, findings four days apart.

### Pillar 2 — AI Security: wolfir Watches Itself

MITRE ATLAS monitoring runs on the Bedrock pipeline in real time. Every Bedrock invocation powering the analysis above is simultaneously monitored by wolfir's own AI security layer:

- **AML.T0051 — Instruction Integrity Check** — pattern scanning against 12 known signatures on every user input before it reaches the Strands Agent
- **AML.T0016 — Ungoverned Model Access** — every Bedrock invocation recorded with model ID; non-approved model IDs flagged immediately
- **AML.T0040 — ML Inference API Access** — invocation rate monitoring with baseline comparison; surges annotated as PIPELINE_RUN or flagged as anomalous
- **AML.T0043 — Crafted Data** — input validation on CloudTrail event structure integrity before events reach the temporal agent
- **AML.T0024 — Ungoverned Data Transfer** — output scanning on every model response for AWS account IDs, resource ARNs, access key patterns, and credential-shaped strings
- **AML.T0048 — Model Tampering** — correctly flagged as N/A; wolfir uses Bedrock foundation models without fine-tuning. Honest non-applicability is more credible than a fabricated detection.

OWASP LLM Top 10 posture, Ungoverned AI detection, NIST AI RMF alignment, EU AI Act readiness, AI-BOM, and Bedrock Guardrails coverage audit complete the picture.

**When you run an event analysis, the AI Security Posture dashboard updates based on the actual Bedrock invocations that just happened.** Cloud security and AI security share a live data plane — connected, not bolted together.

**Live demo:** [wolfir.vercel.app](https://wolfir.vercel.app) — explore with pre-built scenarios, then connect your AWS account for real analysis.
**Source code:** [github.com/bhavikam28/wolfir](https://github.com/bhavikam28/wolfir) — MIT licensed, ~47K lines.

---

## Infrastructure: Terraform, Docker, and a Deliberate Stack Choice

Before getting into AI — let's talk about infrastructure, because it shaped every decision above it.

### Everything is Infrastructure as Code (Terraform)

wolfir's AWS infrastructure is fully defined in Terraform. The primary Terraform module () deploys:

- **S3 bucket** for the Bedrock Knowledge Base source documents — the security playbook library
- **S3 server-side encryption** with AES256, enforced at the bucket level
- **Block public access** on all four dimensions
- **Automated playbook upload** — six curated Markdown playbooks uploaded as S3 objects during , covering IAM access expansion, ungoverned compute usage, data security response, out-of-policy access, OWASP LLM response, and Input Validation Layer

The  on each object means Terraform only re-uploads playbooks that actually changed — deterministic, idempotent deploys.

After , you connect the bucket to a Bedrock Knowledge Base via the console (S3 Vectors, Quick Create), set  in , and wolfir's Agentic Query gains RAG-powered playbook retrieval. The Knowledge Base is optional — wolfir works without it, falling back to inline prompts. But with it, the Agentic Query agent can cite specific playbook excerpts in its responses.

Why Terraform instead of CloudFormation? Familiarity, the provider ecosystem, and the ability to tear down and rebuild the full environment in under 10 minutes — invaluable for testing and for eventually supporting dedicated customer deployments.

### Docker: Zero-Friction Local Setup

The entire stack runs with a single command:

 defines two services:

**Backend** —  container, FastAPI served by uvicorn, exposes port 8000. AWS credentials are provided either via environment variables or by mounting  as a read-only volume:

This is deliberate. wolfir never asks you to paste credentials into a UI. Either use existing AWS CLI profiles (mounted volume) or set standard AWS environment variables. The credentials stay on your machine.

**Frontend** — Vite dev server on port 5173, depends on backend service,  pointed at the backend container.

Both services have  and the backend has a health check on  — if FastAPI is not responding, Docker restarts it rather than failing silently. The Dockerfile uses  (not ) to avoid pip build failures on packages with C extensions.

**Why Docker for a hackathon?** Because "it works on my machine" is not a demo strategy. A judge who clones the repo and runs  gets a running stack in under 2 minutes without installing Python, configuring virtualenvs, or debugging dependency conflicts.

### Frontend: Vercel

The React/TypeScript frontend deploys to Vercel via . When the Vercel deployment cannot reach the FastAPI backend — because the backend runs locally or on EC2 — it falls back to client-side demo mode automatically. Same build artifact, same code, two modes of operation.

---

## How I Built It: 7 Amazon Nova Capabilities

The first version of wolfir was a single-model system. One Nova 2 Lite call received CloudTrail events and was asked to produce a timeline, severity scores, remediation steps, and documentation simultaneously. It failed fast.

The failure was not capability — it was focus. A model trying to simultaneously reason about forensic timelines, assign numerical severity scores with consistency, generate executable CLI commands, and write Confluence-ready documentation produced mediocre output on all four tasks. Context bloated past 16K tokens on any realistic security finding. Remediation steps contradicted the timeline. Documentation used different severity ratings than the severity scores.

The insight: these are genuinely different cognitive tasks. Each requires different attention, different speed/accuracy tradeoffs, and in some cases a different modality entirely. The seven-model architecture followed directly from this.

### 1. Amazon Nova 2 Lite — The Reasoning Engine

The workhorse. Handles forensic timeline analysis (building event narratives from raw CloudTrail events), remediation plan generation (step-by-step AWS CLI commands with rollback procedures), documentation generation (JIRA tickets, Slack alerts, Confluence postmortems), the Aria voice assistant, and Strands Agent orchestration for Agentic Query. Extended thinking at medium effort is used for agentic workflows — this measurably improved tool selection accuracy.

Nova 2 Lite handles the longest context windows in the pipeline. It receives structured timeline summaries rather than raw events — the context pruning layer ensures it always operates on exactly what it needs, nothing more.

### 2. Amazon Nova Micro — The Exposure Classifier

Severity scoring at  — very low for determinism. Each CloudTrail event is classified as LOW/MEDIUM/HIGH/CRITICAL with a confidence score and MITRE Framework technique mapping.

Three parallel calls run via  and return a confidence interval: *"77/100 (CI: 70–84)"* is more honest than a single number, because a single number implies precision that language models do not have.

Hard calibration adjustments handle known miscalibrations:

The model is excellent at pattern recognition. Domain-specific calibration makes it accurate. Neither alone is sufficient.

### 3. Amazon Nova Pro — Visual Analysis

Upload an architecture diagram and Nova Pro performs a STRIDE severity assessment — reading actual network topology, identifying security groups, load balancers, databases, API gateways, and reasoning about exposure surfaces across all six STRIDE categories. This is genuinely multimodal work. Text-only models cannot read a VPC diagram. Nova Pro can. A structured security posture model in under 30 seconds from a PNG.

### 4. Amazon Nova Canvas — Report Imagery

Generates security finding-specific cover images for exported PDF reports. An ungoverned compute usage security finding gets a different cover than a data exposure security finding. This is not decoration — it signals that the output is a real security deliverable, not a plain text export. Each image is generated with event type, severity, and affected services as context parameters.

### 5. Amazon Nova 2 Sonic — Voice Interaction

Powers Aria's voice interface with WebSocket streaming architecture. Real-time speech-to-speech conversation about active events. Ask "what is the root cause?" while running remediation in another terminal. Hands-free security finding Q&A matters when you have four browser tabs open.

### 6. Nova Act — Browser Automation

Click "Generate Nova Act Plan" in the Remediation tab and wolfir generates executable browser automation instructions for AWS Console navigation and JIRA ticket creation. Nova Act translates "revoke this IAM policy, open this Security Hub finding, create this ticket" into specific step-by-step browser actions.

### 7. Nova Multimodal Embeddings — Cross-Security Finding Memory

After every event analysis, a structured behavioral summary is embedded at 384 dimensions and stored in DynamoDB. When a new security finding arrives, it is embedded and compared via cosine similarity against all past events:

Structured feature vectors (event type, MITRE techniques, IP ranges, IAM patterns) are embedded rather than prose descriptions. The model finds semantic patterns in security finding behavior, not surface-level text similarity. This is what catches the second occurrence of a campaign described differently the first time.

The campaign probability formula combines three signals: SHA-256 fingerprint matching (event type + sorted MITRE technique list), MITRE technique overlap count (≥2 shared techniques flags a match), and cosine similarity from Nova Embeddings — all capped at 0.95 to prevent overconfident attribution.

---

## Architecture Deep Dive

### The Pipeline: Dependency Order with Parallelism

**Step 1 — Temporal Analysis (Nova 2 Lite)**

CloudTrail events are filtered to six essential fields before hitting the model: , , ,  summary, , . The  function removes routine background:

Feed 50 routine CloudTrail events to a language model and ask "what is the event pattern?" — it will invent one. Confidently. With specific MITRE Framework technique mappings. Filtering reduces the event set to signals that actually indicate exposure activity. When all events are routine, the pipeline returns "no exposure detected" instead of fabricating a story. That reliability is worth more than covering every possible event.

**Agentic Branch Step (conditional)**

If timeline confidence drops below 0.3, the pipeline automatically runs a CloudTrail anomaly scan via the CloudTrail MCP server for additional signal before proceeding to severity scoring. This is a runtime decision — the orchestrator evaluates its own confidence and chooses to gather more data.

**Step 2 — Exposure Scoring (Nova Micro, parallel)**

Up to five events scored simultaneously via . Each gets severity level, confidence interval, and MITRE Framework mapping.

**Steps 3 + 4 — Remediation + Documentation (Nova 2 Lite, concurrent)**

Both depend only on the timeline output, not on each other. They run concurrently. The remediation agent receives structured summaries — never raw events.

**Step 5 — Save to DynamoDB**

Complete security finding object saved for future correlation using the 4-signal behavioral fingerprint system.

### Context Pruning: The Seam Between Agents

The most important architectural decision in the pipeline was not model selection — it was how data moves between agents. The naive approach (full output from one agent to the next) collapses at any realistic event size. 80 CloudTrail events → 16K tokens of timeline output → 32K tokens by the remediation agent. Models start contradicting their earlier outputs.

Each handoff in wolfir sends a compact, typed object — only what the next agent needs:

Context size dropped 60% across the pipeline. Hallucinations from context bloat disappeared.

### The MCP Architecture: Why Not Direct boto3?

Six FastMCP servers expose 27 tools to the Strands agent layer: CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, and AI Security.

The alternative — direct boto3 calls from within agent prompts — creates implicit coupling. When AWS API behavior changes, agent behavior changes in unpredictable ways. When you want to test agent tool selection, you need live AWS access.

MCP servers create an **explicit typed contract**: the agent calls a named function with typed inputs, the server handles boto3, error handling, retry logic, and response normalization, and the agent gets structured output. Testing is clean — mock the MCP server, never touch agent logic.

Caching at the MCP layer (CloudTrail events: 60s TTL, IAM policies: 5min TTL) eliminates redundant API calls when the Agentic Query agent calls the same tool multiple times in one session.

### DynamoDB: Design Decisions

DynamoDB is wolfir's memory layer. I chose it for three reasons: **PAY_PER_REQUEST billing** (no provisioned capacity to over-provision), **O(1) partition key lookups** by , and **auto-table-creation on first use**.

Auto-creation matters for the deployment story:

A judge who runs the backend for the first time against a real AWS account does not need to pre-create any DynamoDB tables. The table appears automatically on the first security finding write. If DynamoDB is unavailable, the pipeline continues with an in-memory fallback — the demo never breaks because of a missing table.

Nova Embeddings are stored as JSON-serialized arrays alongside each security finding. DynamoDB does not have a native vector type, so the values serialize to a string field and deserialize at query time. For 384-dimensional vectors, cosine similarity runs synchronously at query time — no vector database needed.

### Bedrock Knowledge Base: RAG for Playbooks

wolfir supports two knowledge sources for Agentic Query, selected at runtime:

**Source 1 — AWS Knowledge MCP** (): Real-time AWS documentation search with no setup. The agent queries live AWS docs for security guidance without any Terraform or console configuration.

**Source 2 — Bedrock Knowledge Base** (S3 Vectors): Terraform creates an S3 bucket, uploads six curated security playbooks as Markdown, you connect it to Bedrock Knowledge Base via console, set  in . The agent then retrieves specific, cited excerpts from the playbooks when generating remediation guidance.

The knowledge service tries AWS Knowledge MCP first, falls back to Bedrock KB, falls back to inline prompts:

Why S3 Vectors instead of OpenSearch Serverless? S3 Vectors is purpose-built for document retrieval workloads at lower cost. For six security playbooks ranging from 500–2000 tokens each, OpenSearch Serverless is significantly over-provisioned. S3 Vectors gives the same Bedrock  API surface at a fraction of the cost.

### Bedrock Guardrails: Infrastructure-Level Safety

wolfir queries the Bedrock control plane to list and audit configured guardrails:

In the Agentic Query tab, Bedrock Guardrails are applied at the API level before prompts reach the model. Guardrail enforcement happens at the infrastructure layer, not the prompt layer — it cannot be circumvented by a cleverly crafted input that tricks the model into ignoring its system prompt. The  and  environment variables configure which guardrail profile applies.

The AI Security Posture dashboard shows current guardrail status — active vs. not configured — so the team can see at a glance whether the safety layer is in place.

### Human-in-the-Loop: Approval Gates for Exposurey Remediations

Not all remediations should execute immediately. wolfir classifies each remediation step into three safety tiers:

- **AUTO** — low-exposure read operations, monitoring changes, tagging. Execute without approval.
- **APPROVAL** — policy modifications, security group changes, access key operations. Require explicit approval before executing.
- **MANUAL** — destructive actions (user deletion, S3 bucket deletion). Generate CLI commands; analyst executes manually.

The approval system issues a UUID approval token per pending action:

Approving a token via the API initiates the actual boto3 execution. Every execution result is stored as an execution proof — before-state, after-state, CloudTrail event reference, timestamp. The analyst can audit exactly what wolfir did, when, and with what result. Rollback is implemented for reversible actions using the before-state snapshot.

---

## The AI Security Pillar: MITRE ATLAS Self-Monitoring

This is the part of wolfir I am most proud of building — and the part nobody else is building.

### The Security Model

wolfir's agents consume CloudTrail data, IAM policies, CloudFormation templates, and free-text user prompts. They produce remediation commands, JIRA tickets, Slack messages, and voice responses. Every step of that flow is a exposure surface.

Input data may contain instructions embedded in a CloudTrail event's  field — data that the temporal agent reads and reasons about. A resource exhaustion security finding could cause runaway Bedrock invocations. A crafted query through the Agentic Query interface could cause the model to include private account identifiers in its response. These are real exposures against a system with IAM API access.

### 6 MITRE ATLAS Techniques, Implemented

**AML.T0051 — Input Validation Layer.** Pattern scanning against 12 known signatures on every user input before it reaches the Strands Agent. Signatures include role-adjustment patterns, data extraction probes, and instruction adjustment via data fields. The status indicator in the Agentic Query UI is a live signal from this monitor — not decoration.

**AML.T0016 — Ungoverned Model Access.** Every Bedrock invocation is recorded with the model ID. If any non-approved model outside the defined Nova set is invoked — whether by the orchestrator, the Strands agent, or a tool — the status flips to WARNING and names the offending model.

**AML.T0040 — ML Inference API Access.** Invocation rate monitoring with baseline comparison. Baseline: approximately 20 invocations per full event analysis. Alert threshold: >3× baseline. Expected surges during active pipeline runs are annotated as "PIPELINE_RUN" and do not flag false alerts. Unexpected surges do.

**AML.T0043 — Crafted Data.** Input validation on CloudTrail event structure integrity before events reach the temporal agent. Anomalous field values, falsified timestamps (events with future dates, events with impossible ordering), and structurally malformed events are flagged and optionally quarantined.

**AML.T0024 — Ungoverned Data Transfer via Inference.** Output scanning on every model response for AWS account IDs (12-digit patterns), access key patterns (,  prefixes), private IP ranges, and common secrets patterns. If a response contains what looks like an access key, it is flagged before being returned to the frontend.

**AML.T0048 — Model Tampering.** Explicitly N/A — wolfir uses Bedrock foundation models without fine-tuning or custom training. Claiming to monitor for fine-tuning tampering when there is no fine-tuning pipeline would be misleading. Honest non-applicability is more credible than a fabricated detection.

### Beyond ATLAS

The AI Security pillar also includes:

- **OWASP LLM Top 10 posture** (LLM01–LLM10) — mapped to wolfir's implementation with live radar chart, posture score 87/100
- **Ungoverned AI detection** — CloudTrail InvokeModel monitoring for calls from non-approved identities in the account
- **NIST AI RMF alignment** — Govern, Map, Measure, Manage function coverage assessment
- **EU AI Act readiness** — AI system severity classification readiness
- **AI-BOM** — Bedrock model inventory for the account
- **Guardrail coverage audit** — which Bedrock guardrails are active vs. not configured

When you run an event analysis, the AI Security dashboard updates based on the Bedrock invocations that just ran through the pipeline.

---

## Interactive Security Finding Path Visualization

Understanding what happened requires more than a text timeline. wolfir generates an interactive React Flow graph where every event in the event chain is a clickable node — click any node to see its full severity score, MITRE technique mapping, source IP, timestamp, and what IAM control would have prevented it.

The graph is built from the temporal agent's event chain analysis. Nodes are positioned by event phase (Detection → Discovery → Access Expansion → Cross-Resource Movement → Impact), so the visual layout itself tells the story of how the external entity moved through the environment.

---

## Three Demo Scenarios

wolfir ships with three pre-built demo scenarios, each pre-computed with real Nova outputs so the full pipeline result loads in under 2 seconds.

**Scenario 1 — IAM Access Expansion.** A vendor account misuses an AssumeRole chain to gain AdministratorAccess. MITRE techniques T1098 and T1078. 9 events. CRITICAL severity. Full event chain: discovery → movement → continued access.

**Scenario 2 — AWS Organizations Cross-Account Exposure.** A affected role in a Dev account moves via STS AssumeRole into Production and Security accounts — cross-resource movement across 3 OUs and 12 member accounts. wolfir detects and contains with org-wide SCPs. 18 events. CRITICAL severity.

**Scenario 3 — Ungoverned AI / Ungoverned LLM Use.** Ungoverned Bedrock InvokeModel calls combined with a Input Validation Layer detection. This scenario demonstrates both pillars simultaneously — the AI security pillar catching a exposure that cloud security monitoring alone would not surface. 7 events. CRITICAL severity.

Run scenario 1 first, then scenario 2 — the cross-event memory will flag *"78% probability this is the same external entity."* This is the correlation seeding design: scenario 1 runs silently in the background when you land on the page so scenario 2 always has historical data to correlate against.

---

## Blast Radius Simulator and Organizations Dashboard

### Blast Radius Simulator

Knowing that an IAM identity was affected is one thing. Knowing every resource an external entity with that identity can reach is another. The Blast Radius Simulator takes the affected identity from a security finding and runs IAM policy simulation to map its full reachable exposure surface:

Each resource shows the IAM action that enables access, the exposure zone, the estimated financial impact, and what would have prevented it. This turns *"there was an IAM security finding"* into *"here is exactly what was at exposure and what to fix first."*

### AWS Organizations Dashboard

When security findings span accounts, a single-account view is insufficient. The Organizations Dashboard shows:

- Full org tree (Management Account → OUs → Member Accounts) with real-time severity level indicators
- **Cross-account cross-resource movement detection** — identifying when a security event in one account created vectors into others
- **SCP gap analysis** — which Service Control Policies are missing across OUs, what they would have prevented
- Per-account security posture scores, finding counts, and compliance percentages

---

## ChangeSet Analysis, SLA Tracking, and Cost Impact

### ChangeSet Analysis — Exposure Before You Deploy

The Blast Radius Simulator asks: *what could an external entity reach with this identity?* The ChangeSet Analyzer asks a different question: *what security exposure does this CloudFormation change introduce before you deploy it?*

You paste a CloudFormation change set and wolfir evaluates:

- **IAM policy changes** — new or expanded permissions, wildcard actions, missing conditions
- **Security group modifications** — new ingress rules, port ranges, CIDR scope
- **S3 bucket configuration changes** — public access, encryption, versioning, bucket policy scope
- **Encryption at rest changes** — removing KMS keys, switching to SSE-S3, disabling encryption
- **Network topology changes** — new VPC peering, route table entries, NAT gateway additions

Each finding is rated by severity tier and mapped to the compliance controls it would fail if deployed. A pre-deployment security review in 15 seconds instead of a manual audit that takes hours.

### SLA Tracker — Are You Responding Fast Enough?

wolfir tracks security response SLA compliance across every security finding:

- **P1 (CRITICAL)** — 15-minute detection-to-acknowledgement, 1-hour detection-to-remediation
- **P2 (HIGH)** — 1-hour detection-to-acknowledgement, 4-hour detection-to-remediation

The tracker shows real-time progress bars for active events, historical SLA compliance rates, and predicts exposure exposure for in-flight security findings based on pipeline stage and historical resolution time. SLA miss events are logged to DynamoDB, so compliance reporting is automatic rather than derived from meeting notes.

### Cost Impact Analysis

Every event analysis includes a financial exposure estimate using the IBM Cost of Data Exposure 2024 methodology:

- **Direct compute cost** — ungoverned EC2/Lambda/Bedrock invocations at AWS on-demand pricing
- **Data exposure cost** — estimated cost per PII record exposed, scaled by the record count from Blast Radius
- **Security Finding response labor cost** — analyst hours × median SOC analyst hourly rate × estimated resolution time
- **Regulatory fine exposure** — per-jurisdiction GDPR, CCPA, HIPAA fine calculation based on record count and sensitivity tier
- **Total estimated exposure range** — low/mid/high scenarios with confidence intervals

*"7 API calls happened"* and *"$2.1M–4.7M exposure range"* have very different business impact. The cost output feeds directly into executive briefing documents.

---

## Challenges I Ran Into

### 1. The Strands SDK Async Bridge — The Biggest Architectural Challenge

This one was not in any documentation. Strands  functions are **synchronous**. The agent implementations use  Bedrock calls (, ). You cannot call an async function from a synchronous context without a running event loop — and you cannot just call  inside a Strands tool because FastAPI already owns an event loop in the main thread.

The first approach (creating a new event loop per tool call) worked but introduced 200–400ms of overhead per call just in loop creation and teardown. At 5 agent steps per security finding, that is up to 2 seconds of pure overhead.

The solution was a single persistent worker thread that owns one event loop for the entire process lifetime:

Every Strands  function now submits its async coroutine to  and blocks until it gets the result. Overhead dropped from 200–400ms to under 5ms per call.

### 2. Context Window Collapse Across the Multi-Model Pipeline

A realistic 80-event security finding produces ~40K tokens if you send full output from each agent to the next. By the time you reach the remediation agent, the model is contradicting its own earlier outputs because the beginning of its context is too far away.

Layered context pruning at every handoff — each agent receives only a typed, compact object extracted from the previous output:

- Temporal agent: events filtered to 6 fields, cap of 50 events (~800 tokens in, not 12K)
- Severity scorer: individual events one at a time, never cumulative context
- Remediation agent: structured summary — event pattern, affected resources, root cause — never raw events
- Documentation agent: executive summary + structured findings, never any intermediate reasoning

Token consumption dropped from ~40K to ~12K per pipeline run. Hallucinations from context bloat disappeared.

### 3. Fabricated Exposure Narratives from Routine Events

This was the most damaging reliability issue and the hardest to catch because it failed silently. Feed 50 routine CloudTrail events — , , service-to-service  — and ask "what is the event pattern?" The model will invent one. Confidently. With specific MITRE Framework technique mappings.

Building  was the fix: a curated set of 60+ routine event names filtered before the temporal agent sees anything. Service-to-service  calls required a separate check because the event name alone is not enough:

When all events after filtering are routine, the pipeline returns "no exposure detected." That output is worth more than a convincing-sounding false security finding.

### 4. CloudTrail LookupEvents Is Per-Region — 12 Regions × 50 Events/Page

CloudTrail's  API does not return global results. It queries one region at a time with a maximum of 50 events per page. A real AWS account with activity across us-east-1, us-west-2, and eu-west-1 requires at least three separate paginated queries for complete coverage.

wolfir queries 12 regions by default with rate-limit delays between pages:

A 2-minute cache (keyed on days_back + max_results + profile) means repeated analyses with the same parameters return consistent results and do not re-hit the API.

### 5. The Model Outputs Placeholder Access Key IDs in Remediation Steps

When Nova 2 Lite generates a remediation plan involving a security eventd access key, it outputs steps like:

 is a placeholder. When run against a real account, it fails immediately. The fix requires runtime discovery in every executor function:

Similar sanitization was added for IAM role names, policy ARNs, and instance IDs — every remediation executor function now has a verification step before executing.

### 6. IAM Policy Detach Requires Verifying Attachment First

Calling  on a policy that is not attached throws an exception that breaks execution flow. The model's remediation plan might say "detach AdministratorAccess" but the model output uses just the policy name while AWS requires the full ARN.

Full ARN matching with partial-match fallback:

### 7. Session Revocation Requires a Specific IAM Pattern

"Revoke all active sessions for a role" sounds straightforward. AWS does not have an API call for this — you cannot list and terminate active STS sessions. The only way to invalidate sessions retroactively is an IAM policy condition:

Any session token issued before  is denied all actions. New sessions issued after the policy is attached are unaffected. This is the documented AWS session revocation pattern — but it is non-obvious and required careful testing.

### 8. Exposure Score Miscalibration at temperature=0.1

Even very low temperature does not give perfectly calibrated domain knowledge. Nova Micro consistently over-called certain events:

-  → scored HIGH (appears in enumeration playbooks, but is also a routine SDK health check)
-  → scored CRITICAL regardless of context (legitimate DevOps teams do this constantly)
-  → scored MEDIUM (it is CloudWatch log shipping, not a security finding)

The fix was hard calibration adjustments applied after the model scores, combined with three parallel calls returning confidence intervals rather than single scores.

### 9. CloudTrail Event Field Names Are Inconsistent

Events from different sources use different field name conventions. The same event time might be , , or buried inside a serialized  JSON string. Every event parsing function needed defensive field extraction:

This pattern appears throughout the codebase. Inconsistent field names across real AWS LookupEvents output, raw CloudTrail S3 logs, and Security Hub findings cost days of debugging.

### 10. Bedrock Guardrails Flagged Legitimate Security Queries

Adding Guardrails to Agentic Query introduced a failure mode I did not anticipate:  from completely legitimate security queries. Asking "which IAM role was used in the security finding?" activates Guardrails if "security finding" matches a restricted phrase filter. Security tooling is inherently full of words that content filters are trained to block.

The fix was two-pronged: tuning the guardrail to allow security operations context, and adding graceful degradation:

### 11. Demo Mode Had to Mirror Real Execution Exactly

The demo mode is not a shortcut — it is a parallel implementation that must produce structurally identical output to the real pipeline for the frontend to use one codebase. Every  object, every severity score shape, every timeline format must be identical whether the pipeline ran live or returned pre-computed outputs.

The discipline cost time: every new feature required both a real implementation and a demo implementation. The upside: the discipline forced clean, typed API contracts between every layer. Demo mode is a constant test that the real mode's output structure is stable.

### 12. Nova Act Plan Generation Produced Steps for the Wrong Console

Nova Act generates browser automation plans for AWS Console navigation. Early outputs would generate steps for the IAM Classic console, which AWS has been deprecating. Steps that said "click Users in the left sidebar" stopped working when the console reorganized that page.

Console version annotations were added to the Nova Act prompts — specifying the current IAM console URL structure, not just the destination — and outputs are validated against expected current URL patterns before returning them.

### 13. DynamoDB Table Auto-Creation Race Condition

The  pattern works fine for single requests. Under concurrent load, two security finding analyses starting simultaneously both check for the table, both find it missing, and both try to create it. The second  call throws .

Catching  and continuing is the correct behavior. Took a concurrency test to find this.

### 14. MCP Server Initialization on Import Caused Bedrock Client Creation at Module Load

The MCP server singletons were originally initialized at module import time. When FastAPI imported the orchestrator module, six Bedrock clients and six boto3 sessions were created immediately — before any request arrived, before credentials were configured, in the wrong region.

The fix was deferred initialization with closures:

Same pattern for all six MCP servers and all six agent instances. Startup time dropped from 8 seconds to under 1 second.

---

## Accomplishments I'm Proud Of

**The two-pillar architecture is genuinely new.** Cloud security platforms exist. AI security tools are emerging. A platform where one pillar monitors the other in real time — where running an event analysis updates the AI security posture dashboard — is a new category. I have not seen another project that monitors its own Bedrock pipeline against MITRE ATLAS in production.

**Seven Nova capabilities, each doing non-fungible work.** Not "the API was called seven times." Nova Pro reads images — text models cannot. Nova Micro at temperature=0.1 is deterministic in a way that Nova 2 Lite at default temperature is not. Nova Embeddings finds behavioral patterns that keyword matching misses. Each model handles a task the others either cannot do or cannot do as well.

**The Blast Radius Simulator changes the security response question.** Not *"what happened?"* but *"what could have happened, and what do I lock down right now?"* IAM policy simulation as a first-class security response tool.

**Cross-event memory that actually works.** Run two demo scenarios and watch wolfir surface *"78% probability this is the same external entity"* — overlapping IOCs, MITRE technique overlap, and semantic similarity from Nova Embeddings. That is the moment that made the engineering feel worth it.

**Infrastructure as Code from day one.**  creates the full AWS environment.  removes everything.  runs the full stack in under 2 minutes. Not aspirational — the baseline.

**Credentials never leave the user's machine.** In a security product, this is not optional. wolfir uses local AWS CLI profiles and mounted credentials volumes. Nothing is stored or transmitted.

---

## What I Learned

**Model selection matters more than model capability.** The breakthrough was not using a more powerful model — it was matching each task to the right model. Nova Micro for speed and determinism. Nova 2 Lite for complex reasoning. Nova Pro for vision. Using the wrong model for a task creates quality problems that more capability cannot fix.

**Multi-agent systems are about the seams.** The models are excellent. The plumbing between them is where things break. What gets sent, in what format, with how much context, at what precision — these decisions determined reliability more than any prompt engineering.

**Hallucination prevention is a design pattern, not a prompt trick.** Event filtering before the temporal agent, calibration adjustments for the severity scorer, confidence intervals instead of single scores, "no exposure detected" as a valid output — these are code patterns. Prompts alone could not achieve this.

**Demo engineering is product engineering.** Making the full five-agent pipeline work offline, client-side, with pre-computed real Nova outputs forced me to define clean API contracts, unified data shapes, and graceful degradation across every layer. The discipline of keeping demo mode and real mode on the same API contract made the real backend better.

**Infrastructure decisions compound.** Terraform from day one meant the Knowledge Base setup was three commands. Docker from day one meant the demo setup was one command. These are not things you add later cleanly.

**Security products must monitor themselves.** Monitoring wolfir's Bedrock pipeline with MITRE ATLAS came from asking: "If someone targeted wolfir specifically, what would they try?" Answering that question led to building a genuinely new capability.

---

## What's Next for wolfir

**Real-time streaming via EventBridge.** EventBridge rules on CloudTrail write events → SQS FIFO with priority tiers → wolfir workers on ECS Fargate. Shifts wolfir from batch analysis to live event detection.

**Multi-account correlation across AWS Organizations.** wolfir already has the Organizations Dashboard and cross-account AssumeRole support. Next: detecting cross-resource movement campaigns across OUs using the cross-event memory system.

**AI Red Teaming module.** Automated Input Validation Layer testing against the user's own Bedrock pipelines. If you deploy Nova in production, you should verify that your guardrails actually hold against realistic crafted inputs.

**Deeper JIRA/Slack/Confluence integration via Nova Act.** Full browser automation to create tickets, post to security finding channels, and generate postmortems in one flow — not just plan generation, but execution.

**Community playbook library.** The Bedrock Knowledge Base integration already supports custom playbooks in S3. The vision: community-contributed SOPs for common AWS event types — curated, versioned, searchable via RAG.

**Enterprise deployment template.** CloudFormation template for VPC-isolated backend, private Bedrock endpoints, WAF in front of the FastAPI layer, and multi-region DynamoDB Global Tables for cross-region security finding correlation.

---

## The Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **AI models** | Amazon Nova (Pro · 2 Lite · Micro · 2 Sonic · Canvas · Act · Embeddings) | 7 capabilities, each with a distinct non-fungible role |
| **Agent framework** | Strands Agents SDK | Native  decorators, Bedrock-native, pipeline + autonomous mode |
| **MCP servers** | FastMCP — 6 servers, 27 tools | Typed contracts between agents and AWS APIs, testable in isolation |
| **Backend** | FastAPI + uvicorn + Python 3.11 | Async-native,  for parallel agent steps |
| **Frontend** | React + TypeScript + Vite + Tailwind + Framer Motion + React Flow | Full type safety, animation-ready, interactive event path diagrams |
| **Memory** | DynamoDB (PAY_PER_REQUEST) + Nova Embeddings | Auto-provisioning, cosine similarity at query time, in-memory fallback |
| **Knowledge** | Bedrock Knowledge Base (S3 Vectors) + AWS Knowledge MCP | RAG-powered playbook retrieval, dual source with fallback chain |
| **Safety** | Bedrock Guardrails + MITRE ATLAS monitoring | Infrastructure-level enforcement + AI-layer behavioral monitoring |
| **Infrastructure** | Terraform | Reproducible, reversible, audit-ready |
| **Containers** | Docker + docker-compose | Zero-friction local setup, credential mounting, health checks |
| **Frontend deploy** | Vercel | CDN-deployed static build, client-side demo mode when backend offline |

---

## Who This Is For

**Small and mid-sized security teams** that do not have Splunk, Cortex XSOAR, or dedicated SOC analysts. They have CloudTrail, maybe GuardDuty, and not enough hours. wolfir gives them what a 20-person SOC has: a structured response pipeline that runs in minutes.

**Cloud engineers learning security response.** The three demo scenarios walk through realistic event chains — IAM access expansion, cross-account cross-resource movement, and ungoverned AI misuse. Running a scenario and reading the generated event timeline teaches you what to look for in real events.

**Teams deploying AI who need to secure it.** The MITRE ATLAS self-monitoring pillar is a proof of concept for a problem barely anyone is addressing: who watches the watcher? If you are deploying language models for security analysis, Input Validation Layer and API misuse are real exposure vectors, not theoretical ones.

**AWS builders exploring multi-agent architectures.** The codebase is a reference implementation: Strands Agents SDK + MCP + multiple Nova models + DynamoDB cross-event memory + Bedrock Knowledge Base + demo/real mode coexistence. MIT-licensed.

I am keeping the barrier low: MIT license, credentials never leave your machine, ~$0.01–0.02 per security finding on Bedrock on-demand, ~$2–5/month estimated for light usage.

---

## Conclusion

wolfir started from two questions. What happens when AI actually responds to security alerts? And who watches the AI?

Building it showed me that Nova's model diversity is not marketing — it is architecture. Micro for speed, 2 Lite for reasoning, Pro for vision, Canvas for generation, Act for automation, Sonic for voice, Embeddings for similarity. Each does something the others cannot. The Strands Agents SDK makes them work together. Terraform makes the infrastructure reproducible. Docker makes the setup frictionless. Bedrock Knowledge Bases ground the responses in your security playbooks. Guardrails make it safe at the API level.

The AI security pillar is where I think the industry is heading. Every security platform will be AI-powered soon. Every AI-powered security platform is itself a exposure surface. The ones that monitor their own pipelines with frameworks like MITRE ATLAS — and build the infrastructure to do it systematically — will be the ones that earn trust. wolfir is a proof of concept for that future.

Try it. Share your feedback.

---

**Live Demo:** [wolfir.vercel.app](https://wolfir.vercel.app) — explore with demo scenarios, then connect your AWS account for real analysis.
**Source Code:** [github.com/bhavikam28/wolfir](https://github.com/bhavikam28/wolfir) — MIT licensed.

**Built with:** Amazon Nova (Pro · 2 Lite · Micro · 2 Sonic · Canvas · Act · Multimodal Embeddings) · Strands Agents SDK · 6 AWS MCP Servers · Bedrock Knowledge Bases · Bedrock Guardrails · FastAPI · React · DynamoDB · Terraform · Docker