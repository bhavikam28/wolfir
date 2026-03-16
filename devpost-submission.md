# wolfir — Devpost Submission

---

## Inspiration

**960 alerts a day. 40% go uninvestigated.**

That number, from Prophet Security's 2025 AI in SOC Survey, is what started this project. AWS has built genuinely exceptional detection infrastructure — CloudTrail captures every API call, GuardDuty surfaces behavioral anomalies, Security Hub aggregates findings from Inspector, Macie, and dozens of partner tools, IAM Access Analyzer flags overly permissive policies. **The signal is all there, in real time.**

So why does the journey from *"we detected something"* to *"we fixed it and documented it"* still take 45 minutes of manual work at 2am?

The problem isn't detection. **It's the time cost of turning detection into action.** Correlating events, building a timeline, figuring out root cause, mapping the blast radius, writing a remediation plan with real AWS CLI commands, and documenting everything for the team — that part is still almost entirely manual. An analyst who should be making decisions is instead building a spreadsheet.

That gap was the first motivation.

**Then a second problem emerged.** Every modern security platform now runs on AI. GuardDuty uses ML. Security Hub correlates with AI. I was building another AI-powered security tool — but as I built, I kept asking a question nobody seemed to be asking: *who's watching the AI itself?*

If an attacker can embed instructions into the data my models process, abuse my Bedrock inference API, trigger runaway invocations, or extract sensitive account patterns through model outputs — **my security tool becomes the attack surface.** MITRE built the ATLAS framework specifically to catalogue adversarial ML threats. Almost nobody deploys it in production. wolfir became the exception.

**The name is deliberate.** wolf + IR (Incident Response). A wolf hunts in a pack — coordinated, patient, each member with a role, sharing context, moving from signal to resolution together. That's exactly how wolfir works: seven Nova capabilities, each specialized, sharing structured state, going from raw CloudTrail events to a complete incident response package.

---

## What It Does

wolfir is an **autonomous cloud security and AI security platform for AWS**, built on two architecturally connected pillars.

---

### Pillar 1 — Cloud Security: End-to-End Incident Response

You feed it CloudTrail events — from a live AWS account or one of three built-in attack scenarios — and a **five-agent Nova pipeline** fires automatically:

**Detect → Investigate → Classify → Remediate → Document**

The output is a complete incident response package, not a report. Here is everything it produces:

**Attack Analysis**
- Chronological attack timeline with attack chain reconstruction and root cause identification
- **Interactive Attack Path Diagram** — a React Flow graph where every event is a clickable node. Click any node to see its risk score, MITRE ATT&CK technique, source IP, timestamp, and the exact IAM control that would have prevented it
- Per-event risk scores with confidence intervals (e.g. 77/100, CI: 70–84) using three parallel Nova Micro calls via `asyncio.gather()`
- MITRE ATT&CK technique mapping per finding

**Blast Radius Simulator**
- Given the compromised identity, runs IAM policy simulation to map *every* AWS resource an attacker can reach
- Results tiered as CRITICAL / HIGH / MEDIUM / LOW with estimated financial impact per resource
- Turns "we had an IAM incident" into "here's exactly what was at risk and what to lock down first"

**AWS Organizations Dashboard**
- Full org tree — Management Account → OUs → Member Accounts — with real-time threat level indicators
- Cross-account lateral movement detection: identifies when compromise in one account created vectors into others
- SCP gap analysis: which Service Control Policies are missing, and what they would have blocked

**Remediation — Actions, Not Suggestions**
- Real, executable AWS CLI commands generated for every finding
- **Three-tier human-in-the-loop approval system:**
  - AUTO: low-risk actions execute immediately (tagging, monitoring changes)
  - APPROVAL: policy modifications, security group changes, access key operations require explicit sign-off
  - MANUAL: destructive actions generate CLI commands for analyst execution
- Before/after state snapshots and one-click rollback for every executed step
- Every action is CloudTrail-logged and stored as execution proof with timestamp

**Compliance Mapping — 6 Frameworks, Automatic**
- Every finding auto-mapped to specific control IDs across:
  - CIS AWS Foundations Benchmark
  - NIST 800-53 rev5 (AC, AU, IA, SC controls)
  - SOC 2 Type II (CC6, CC7, A1)
  - PCI-DSS v4.0 (Requirements 7, 10)
  - SOX IT General Controls (ITGC-04, ITGC-06)
  - HIPAA (§164.312, §164.308)
- No manual auditing required — the compliance report is generated automatically with every incident

**Cost Impact Analysis**
- Financial exposure estimate using the IBM Cost of Data Breach 2024 methodology
- Covers: direct compute cost, data exposure cost per PII record, incident response labor, regulatory fine exposure (GDPR, CCPA, HIPAA)
- Low/mid/high scenario ranges with confidence intervals — gives leadership a financial framing alongside the technical timeline

**SLA Tracker**
- Real-time P1/P2 SLA compliance monitoring across every incident
- P1 (CRITICAL): 15-minute detection-to-acknowledgement, 1-hour to remediation
- P2 (HIGH): 1-hour acknowledgement, 4-hour remediation
- Breach prediction for in-flight incidents based on pipeline stage and historical resolution time
- All SLA events logged to DynamoDB for automatic compliance reporting

**ChangeSet Analysis**
- Pre-deployment security review of CloudFormation change sets
- Evaluates IAM policy changes, security group modifications, S3 configuration changes, encryption changes, and network topology changes
- Each finding rated by risk tier and mapped to compliance controls it would violate if deployed
- 15-second review instead of a manual audit that takes hours

**Documentation**
- JIRA tickets, Slack alerts, and Confluence postmortems generated automatically
- Nova Canvas generates incident-specific PDF report cover art — a crypto mining incident looks different from a data exfiltration incident
- Nova Act generates executable browser automation steps for AWS Console navigation and JIRA ticket creation

**Cross-Incident Memory**
- Every incident persisted to DynamoDB with behavioral fingerprints
- Four-signal correlation on every new incident:
  - SHA-256 fingerprint matching (attack type + sorted MITRE technique list)
  - MITRE technique overlap (≥2 shared techniques triggers a match)
  - IOC matching — shared IP addresses and IAM ARNs across incidents
  - Cosine semantic similarity via Nova Multimodal Embeddings (384 dimensions)
- Run the IAM escalation demo, then the crypto mining demo — wolfir surfaces "78% probability this is the same attacker"

**Agentic Query**
- A genuine Strands autonomous agent — not a fixed pipeline
- 19 registered Strands tools across 6 AWS service modules: CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, AI Security
- Ask it anything. It plans its own investigation, picks its own tools, executes multi-step workflows
- Extended thinking enabled for complex multi-tool queries

**Voice Interface — Aria**
- Nova 2 Sonic speech-to-speech streaming
- Ask "what happened in the last 24 hours?" and get spoken incident analysis
- Hands-free SOC investigation when you have four browser tabs open

**Visual Architecture Analysis**
- Upload an architecture diagram (PNG/JPG) and Nova Pro performs STRIDE threat assessment
- Reads actual VPC topology, identifies security groups, load balancers, databases, API gateways
- 50+ check types in under 30 seconds — text models cannot do this; multimodal is non-negotiable

**Three Built-In Demo Scenarios — No AWS Account Required**
- **IAM Privilege Escalation** — Contractor abuses AssumeRole chain to gain AdministratorAccess. MITRE T1098, T1078. 9 events. CRITICAL.
- **AWS Organizations Cross-Account Breach** — Compromised Dev account role pivots via STS into Production and Security accounts across 3 OUs, 12 member accounts. 18 events. CRITICAL.
- **Shadow AI / LLM Abuse** — Ungoverned Bedrock InvokeModel calls combined with a prompt injection attempt. Exercises the MITRE ATLAS self-monitoring pipeline — the AI security pillar catching what the cloud pillar cannot. 7 events. CRITICAL.

---

### Pillar 2 — AI Security: wolfir Watches Itself

Every Bedrock invocation powering the analysis above is simultaneously monitored against the MITRE ATLAS framework. **This is the part nobody else is building.**

**6 MITRE ATLAS Techniques — Runtime Checks, Not Labels**

- **AML.T0051 — Prompt Injection:** Pattern scanning on every user input AND CloudTrail event data fields before reaching the model. 12 injection signatures including role-override patterns, data exfiltration probes, and instruction injection via resource names.
- **AML.T0016 — Capability Theft:** Every Bedrock invocation is recorded with the model ID. If any non-approved model outside the Nova allowlist is invoked, status flips to WARNING and names the offending model.
- **AML.T0040 — ML Inference API Access:** Invocation rate monitoring with baseline comparison. Alert threshold: >3× baseline. Expected pipeline spikes annotated as "PIPELINE_RUN" — unexpected spikes flag immediately.
- **AML.T0043 — Adversarial Data:** Input validation on CloudTrail event structure integrity — manipulated timestamps, anomalous field values, structurally malformed events flagged before reaching the temporal agent.
- **AML.T0024 — Data Exfiltration via Inference:** Output scanning on every model response for AWS account IDs, access key patterns (AKIA/ASIA prefixes), private IP ranges, and secrets patterns. Flagged before reaching the frontend.
- **AML.T0048 — Model Poisoning:** Explicitly N/A. wolfir uses Bedrock foundation models without fine-tuning. Documented honestly — honest non-applicability is more credible than a fake detection.

**Beyond MITRE ATLAS**
- OWASP LLM Top 10 posture dashboard (LLM01–LLM10) with live radar chart — posture score 87/100
- Shadow AI detection — CloudTrail InvokeModel monitoring for ungoverned Bedrock calls from non-approved principals
- NIST AI RMF alignment — GOVERN, MAP, MEASURE, MANAGE function coverage
- EU AI Act readiness assessment
- AI-BOM — Bedrock model inventory for the account
- Guardrail coverage audit — which Bedrock guardrails are active vs. not configured

**When you run an incident analysis, the AI Security dashboard updates based on the actual Bedrock invocations that just ran.** Cloud security and AI security share a live data plane. The two pillars are connected, not bolted together.

---

### 7 Amazon Nova Capabilities — Each Doing Non-Fungible Work

- **Nova Pro** → Visual STRIDE threat modeling on uploaded architecture diagrams. The only multimodal Nova — text models cannot read a VPC diagram.
- **Nova 2 Lite** → Timeline reconstruction, remediation plan generation, documentation, Agentic Query orchestration with extended thinking, Aria voice responses. The reasoning workhorse.
- **Nova Micro** → Per-event risk classification at temperature=0.1 for determinism. 3 parallel calls via `asyncio.gather()` = confidence interval output. Speed over capability for classification.
- **Nova 2 Sonic** → Aria voice assistant with WebSocket streaming. Speech-to-speech, not TTS bolted onto an LLM.
- **Nova Canvas** → Incident-specific PDF report cover image generation. Each incident type gets a unique visual — not decoration, a signal this is a real security deliverable.
- **Nova Act** → Executable browser automation plans for AWS Console navigation and JIRA ticket creation. Generates actions, not just instructions.
- **Nova Multimodal Embeddings** → 384-dimensional behavioral vectors stored in DynamoDB for cross-incident semantic similarity. Finds campaigns described differently each time.

---

## How We Built It

**Backend:** Python + FastAPI + Strands Agents SDK + boto3 + uvicorn

**Frontend:** React + TypeScript + Vite + Tailwind CSS + Framer Motion + React Flow, deployed on Vercel

**Infrastructure:** Terraform (S3 + Bedrock Knowledge Base + playbook upload), Docker + docker-compose (single `docker compose up` for the full stack)

**Memory:** DynamoDB (PAY_PER_REQUEST, auto-table-creation on first use, in-memory fallback when unavailable)

**Knowledge:** Bedrock Knowledge Base (S3 Vectors) + AWS Knowledge MCP — dual source with fallback chain for RAG-powered playbook retrieval

**Safety:** Bedrock Guardrails (content filters, prompt attack blocking, PII masking) + MITRE ATLAS runtime monitoring

---

**The key architectural decision: treat every pipeline step as a specialized agent, not a general-purpose model.**

The first version was a single Nova 2 Lite call that received CloudTrail events and was asked to produce a timeline, risk scores, remediation steps, and documentation simultaneously. It failed fast. Not because the model lacked capability — because a model trying to do four genuinely different cognitive tasks at once produces mediocre output on all four.

The pipeline decomposition was the insight: each task requires different attention, different speed/accuracy tradeoffs, and in some cases a different modality entirely.

**Context pruning at every handoff was the engineering breakthrough.** The naive approach — passing full agent output to the next agent — collapses at any realistic incident size. A 50-event CloudTrail incident produces ~40K tokens of raw output by the time you reach the remediation agent. The model starts contradicting its own earlier outputs. The fix: each agent receives only a compact typed object with exactly what it needs.

```
Raw events → filter_interesting_events() → 50 events × 6 fields = ~800 tokens
Timeline output → timeline_handoff{} = attack_pattern, root_cause,
                  affected_resources[:10], risk_signals, confidence
                  ~800 tokens to next agent, not 12K
```

**Token consumption dropped from ~40K to ~12K per pipeline run. Hallucinations from context bloat disappeared.**

**The MCP architecture creates explicit typed contracts.** Six FastMCP server modules expose 19 Strands tools to the agent layer. The alternative — direct boto3 calls from within agent prompts — creates implicit coupling. When AWS API behavior changes, agent behavior changes unpredictably. MCP servers create a clean seam: mock the MCP server in tests, never touch agent logic.

**The persistent async worker solved the Strands SDK event loop problem.** Strands `@tool` functions are synchronous. Our agent implementations use async Bedrock calls. The naive fix (new event loop per tool call) added 200–400ms of overhead per call. The solution: one persistent worker thread owns one event loop for the entire process lifetime. `asyncio.run_coroutine_threadsafe()` submits coroutines from synchronous tool functions. Overhead dropped from 200–400ms to under 5ms per call.

**Credentials never leave the user's machine.** wolfir uses local AWS CLI profiles or mounted `~/.aws` volumes. Nothing is stored or transmitted. In a security product, this is not optional.

---

## Challenges We Ran Into

**Token bloat killed the first architecture.** Passing full agent outputs sequentially hit context limits before the remediation agent started reasoning. The pruning layer fixed this: 60% reduction in token consumption, hallucinations from context bloat eliminated.

**Strands SDK isn't designed for deterministic multi-step handoffs.** It excels at autonomous single-agent reasoning. For a security pipeline where you need auditable, deterministic execution order and inspectable intermediate state, you have to architect around it. Running specialized models as @tool functions inside a Strands orchestrator gave us the best of both worlds.

**The persistent async worker bridge.** Strands tool functions are synchronous. FastAPI owns an event loop. Creating a new event loop per tool call works but adds hundreds of milliseconds per call. The single persistent worker thread with `asyncio.run_coroutine_threadsafe()` reduced per-call overhead from 200–400ms to under 5ms.

**Hallucinated threat narratives from routine events.** Feed 50 routine CloudTrail events — `PutLogEvents`, `DescribeInstances`, service-to-service `AssumeRole` — and ask "what's the attack pattern?" The model invents one. Confidently. With specific MITRE techniques. The fix was `filter_interesting_events()`: a curated set of 60+ routine event names stripped before the temporal agent sees anything. When all events after filtering are routine, the pipeline returns "no threat detected" — which is worth more than a convincing-sounding false incident.

**Risk score miscalibration at temperature=0.1.** Even near-zero temperature doesn't give perfectly calibrated domain knowledge. Nova Micro consistently over-called certain events: `GetCallerIdentity` scored HIGH (it appears in attacker recon playbooks but is also a routine SDK health check), `PutLogEvents` scored MEDIUM (it's CloudWatch log shipping). Hard calibration overrides applied after model scoring fixed this. Three parallel calls plus confidence intervals made the output honest about its own uncertainty.

**The model outputs fake access key IDs in remediation steps.** When Nova 2 Lite generates a remediation plan that includes disabling a compromised access key, it outputs placeholders like `AKIAEXAMPLE`. Real keys start with `AKIA` or `ASIA`. The fix: runtime discovery in every executor function — if the model-generated key doesn't match the real format, look it up via `iam.list_access_keys()` before executing.

**Session revocation requires a non-obvious IAM pattern.** "Revoke all active sessions for a role" sounds straightforward. AWS doesn't have an API for this. The only way to invalidate STS sessions retroactively is a `DateLessThan: aws:TokenIssueTime` deny policy condition — any token issued before a specific timestamp is denied all actions. Getting the timestamp wrong either revokes nothing (too far in the past) or blocks all future sessions (too far in the future). Required careful testing and explicit validation.

**Bedrock Guardrails blocked legitimate security queries.** Asking "which IAM role was used in the attack?" trips content filters because "attack" matches a sensitive phrase filter. Security tooling is inherently full of words content filters are trained to block. The fix was two-pronged: tuning the guardrail to allow security operations terminology, and adding graceful degradation so a guardrail rejection surfaces a useful message with a suggested rephrase rather than a 500 error.

**CloudTrail event field names are inconsistent.** The same event time might be `eventTime`, `EventTime`, or buried inside a serialized `CloudTrailEvent` JSON string. Every event parsing function needed defensive extraction with multiple fallback paths. Inconsistent field names across LookupEvents API output, raw CloudTrail S3 logs, and Security Hub findings cost days of debugging.

**DynamoDB table auto-creation race condition.** Under concurrent requests, two analyses starting simultaneously both find the table missing and both try to create it. The second throws `ResourceInUseException`. Fix: catch `ResourceInUseException` and continue — the table was created by the concurrent request. Took a concurrency test to find this.

**Demo mode had to mirror real execution exactly.** Every `ExecutionResult` object, every risk score shape, every timeline format is identical whether the pipeline ran live or returned pre-computed outputs. Adding confidence intervals to risk scores required updating both the live Nova Micro calls and the stored demo outputs. Any divergence between modes breaks one of them in ways that are hard to debug. The discipline enforced clean, typed API contracts between every layer.

---

## Accomplishments That We're Proud Of

**The two-pillar architecture is genuinely new.** Cloud security platforms exist. AI security tools are emerging. A platform where one pillar monitors the other in real time — where running an incident analysis updates the AI security posture dashboard — is a new category. We haven't seen another project that monitors its own Bedrock pipeline against MITRE ATLAS in production.

**Seven Nova capabilities, each doing work that can't be substituted.** Nova Pro because you literally cannot analyze an uploaded architecture diagram for STRIDE threats without multimodal capability — text models are blind to images. Nova Micro at temperature=0.1 for determinism — more reliable for classification than Nova 2 Lite at default temperature. Nova Embeddings for behavioral similarity — finds campaigns described differently each time. These aren't "we used Nova for one thing." They're deliberate model-to-task matching where using the wrong model degrades output quality in ways that more capability can't compensate for.

**The Blast Radius Simulator changes the incident response question.** Not "what happened?" but "what could have happened, and what do we lock down right now?" IAM policy simulation as a first-class incident response tool gives security teams the prioritized list they actually need.

**The cross-incident memory correlation.** Running two demo scenarios and watching wolfir surface "78% probability this is the same attacker" — with overlapping IOCs, MITRE technique overlap, and semantic similarity from Nova Embeddings — that's the moment that made the engineering feel worth it.

**Remediations actually execute.** Before/after state snapshots, CloudTrail confirmation of every action, one-click rollback. This is not a report generator. It takes action with accountability.

**Infrastructure as Code from day one.** `terraform apply` creates the full AWS environment including Bedrock Knowledge Base S3 bucket with encrypted, versioned playbook storage. `terraform destroy` removes everything. `docker compose up` runs the full stack in under 2 minutes. These aren't aspirational — they're the baseline.

**Credentials never leave the user's machine.** In a security product, this isn't a nice-to-have. We use local AWS CLI profiles and mounted credentials volumes. Nothing is stored or transmitted.

---

## What We Learned

**Multi-agent systems are less about AI capability than about the seams between agents.** The hard problems were: what format does the handoff use, what gets pruned, what gets carried forward, and how does the orchestrator know when a step has produced usable output. Get those seams wrong and no amount of model capability compensates.

**Model selection matters more than model capability.** The breakthrough wasn't using a more powerful model — it was matching each task to the right model. Nova Micro at temperature=0.1 for classification. Nova 2 Lite for long-context reasoning. Nova Pro for vision. Using the wrong model for a task creates quality problems that better prompts can't fix.

**Hallucination prevention is a design pattern, not a prompt trick.** Event filtering before the temporal agent, calibration overrides for the risk scorer, confidence intervals instead of single scores, "no threat detected" as a valid output, context pruning at every handoff — these are code patterns that made the pipeline dramatically more reliable. Prompts alone couldn't achieve this.

**Demo engineering is product engineering.** Making the full five-agent pipeline work offline, client-side, with pre-computed real Nova outputs forced us to define clean API contracts, unified data shapes, and graceful degradation across every layer. The discipline of keeping demo mode and real mode on the same API contract made the real backend better.

**Infrastructure decisions compound.** Terraform from day one meant the Knowledge Base setup was three commands. Docker from day one meant the demo setup was one command. These aren't things you add later cleanly.

**The most important realization: securing AI is the next frontier in cloud security, and it's not being treated that way yet.** SIEM and SOAR tools are converging on AI for detection and triage. The attack surface shifts to those AI systems. MITRE ATLAS exists. Most teams don't deploy it. wolfir does — and builds the proof of concept for a monitoring layer that every AI-powered security platform will eventually need.

---

## What's Next for wolfir

- **Real-time streaming via EventBridge** — EventBridge rules on CloudTrail write events → SQS FIFO with priority tiers → wolfir workers on ECS Fargate. Shifts wolfir from batch analysis to live alert stream.
- **Multi-account correlation across AWS Organizations** — cross-incident memory system extended to detect lateral movement campaigns across OUs, not just within a single account.
- **AI Red Teaming module** — automated prompt injection testing against the user's own Bedrock pipelines. If you deploy Nova in production, you should verify that your guardrails actually hold against real adversarial inputs.
- **Deeper JIRA / Slack / PagerDuty integration via Nova Act** — full browser automation for ticket creation, incident channel posting, and postmortem generation in one flow, not just plan generation.
- **Community playbook library** — the Bedrock Knowledge Base integration already supports custom playbooks in S3. The vision is community-contributed SOPs for common AWS incident types — curated, versioned, searchable via RAG.
- **Enterprise deployment template** — CloudFormation template for VPC-isolated backend, private Bedrock endpoints, WAF in front of the FastAPI layer, and multi-region DynamoDB Global Tables for cross-region incident correlation.
- **SOC integration** — direct Slack, PagerDuty, and JIRA webhook output with on-call escalation logic built into the remediation approval flow.
