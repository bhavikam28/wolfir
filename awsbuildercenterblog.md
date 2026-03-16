# wolfir: The AI Security Platform That Watches Itself

*wolfir: 7 Amazon Nova capabilities, Strands Agents SDK, and MITRE ATLAS self-monitoring for cloud and AI security  -  every architectural decision explained.*

---

## The wolfir Story

### Inspiration: What if AI actually responded to security alerts  -  and watched itself doing it?

There's a question that wouldn't leave me alone while working with AWS security tooling: AWS has built exceptional detection infrastructure. CloudTrail captures every API call. GuardDuty surfaces behavioral anomalies. Security Hub aggregates findings from Inspector, Macie, and dozens of partner tools. IAM Access Analyzer flags overly permissive policies. The signal is all there, in real time.

So why does the journey from "we detected something" to "we fixed it and documented it" still take 45 minutes of manual work at 2am?

Prophet Security's 2025 AI in SOC Survey puts the average SOC at 960+ alerts per day, with 40% going completely uninvestigated. The problem isn't detection. It's the time cost of turning detection into action  -  correlating events, building a timeline, figuring out the root cause, mapping the blast radius, generating a remediation plan with real AWS CLI commands, and documenting everything for the team. That part is still almost entirely manual.

In February 2026, I started building what would become wolfir: an agentic pipeline that takes CloudTrail events and produces a complete incident response package  -  autonomously, with the analyst approving rather than executing.

But as I built, a second problem surfaced. Every modern security platform runs on AI. GuardDuty uses ML. Security Hub correlates with AI. And here I was building another AI-powered security tool. But who's watching the AI itself? If an unauthorized actor can embed instructions into the data my models process, misuse my Bedrock inference API, or extract sensitive account patterns through model outputs  -  my security tool becomes the attack surface.

MITRE built the ATLAS framework specifically for AI/ML attack threats. Almost nobody deploys it in production. wolfir became the exception: a security platform that monitors its own Bedrock AI pipeline with MITRE ATLAS in real time, while simultaneously running cloud incident response.

That's the two-pillar architecture. **Cloud security and AI security, one platform, where each pillar watches the other.**

---

### System Architecture

![wolfir comprehensive platform architecture  -  all inputs, 5-agent pipeline, 12-feature incident response package, AI security self-monitor, and Amazon Bedrock foundation](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-architecture-v2.png)

*Figure 1  -  wolfir full platform architecture. Top: four input sources (CloudTrail events, architecture diagrams, demo scenarios, CloudFormation ChangeSets). Middle: the 5-agent Strands pipeline with context pruning at every handoff, plus the autonomous Agentic Query mode. Bottom left: the complete 12-feature Incident Response Package  -  Attack Path, Blast Radius, Remediation, Compliance Mapping, SLA Tracker, Cost Impact, PDF Report, AWS Organizations, ChangeSet Analysis, Cross-Incident Memory, Risk Scores, Voice (Aria). Bottom right: the AI Security Pillar monitoring the pipeline with MITRE ATLAS + OWASP + NIST AI RMF. Foundation: Amazon Bedrock with all 7 Nova capabilities, Guardrails, and Knowledge Base.*

### Why "wolfir"?

**wolf + IR** (Incident Response). A wolf hunts in a pack  -  coordinated, each member with a role, sharing context, moving from signal to resolution together. That's exactly how our multi-agent pipeline works: seven Nova capabilities, each specialized, sharing structured state, going from raw CloudTrail events to a complete incident response package.

---

## What is wolfir?

wolfir is an autonomous security platform for AWS that closes two gaps simultaneously.

**Cloud security**  -  You feed it CloudTrail events (from a live AWS account or one of three demo scenarios) and a five-agent Nova pipeline runs: Detect -> Investigate -> Classify -> Remediate -> Document. The output is a complete incident response package:

- Chronological attack timeline with root cause and attack chain reconstruction
- Interactive attack path diagram (React Flow, click-to-inspect each node)
- **Blast Radius Simulator**  -  given the affected identity, maps every AWS service, resource, and data store an unauthorized actor can reach using IAM policy simulation
- **AWS Organizations Dashboard**  -  multi-account org tree, cross-account cross-resource movement detection, SCP gap analysis across OUs
- Per-event risk scores with MITRE ATT-CK technique mapping and confidence intervals
- Compliance mapping across CIS, NIST 800-53, SOC 2, PCI-DSS, SOX, and HIPAA
- Cost impact using the IBM Cost of data exposure methodology
- Remediation plan with real AWS CLI commands, human-in-the-loop approval gates, before/after state snapshots, and one-click rollback
- Documentation ready for JIRA tickets, Slack alerts, and Confluence postmortems
- **SLA Tracker**  -  incident response SLA monitoring with SLA compliance prediction
- **ChangeSet Analysis**  -  CloudFormation change risk assessment before you deploy

Cross-incident memory, powered by DynamoDB and Nova Multimodal Embeddings, correlates new incidents with past ones using behavioral fingerprints, MITRE technique overlap, and semantic similarity. Run two scenarios and the second tells you "78% probability this is the same unauthorized actor."

**AI security**  -  wolfir watches itself. Every Bedrock invocation powering the analysis above is simultaneously monitored against the MITRE ATLAS framework. Six techniques tracked in real time. OWASP LLM Top 10 posture. Shadow AI detection. Bedrock Guardrails integration. NIST AI RMF alignment.

These two pillars are architecturally connected  -  not bolted together. When you run an incident analysis, the AI Security Posture dashboard updates based on the actual Bedrock invocations that just happened.

**Live demo:** [wolfir.vercel.app](https://wolfir.vercel.app)  -  no AWS account needed, full feature set, results in under 2 seconds.
**Source code:** [github.com/bhavikam28/wolfir](https://github.com/bhavikam28/wolfir)  -  MIT licensed, ~47K lines.

---

### wolfir Dashboard

![wolfir dashboard  -  incident analysis results showing attack timeline, risk scores, MITRE ATT-CK mapping, and remediation plan](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-dashboard-screenshot.png)

*Figure 2  -  wolfir dashboard after running an IAM permission escalation scenario. Top: attack timeline with root cause and confidence score. Middle: per-event risk classification with MITRE technique mapping. Bottom: generated remediation plan with before/after state and CloudTrail confirmation.*

---

## Infrastructure: Terraform, Docker, and a Deliberate Stack Choice

Before getting into AI  -  let's talk about infrastructure, because it shaped every decision above it.

### Everything is Infrastructure as Code (Terraform)

wolfir's AWS infrastructure is fully defined in Terraform. The primary Terraform module (`terraform/main.tf`) deploys:

- **S3 bucket** for the Bedrock Knowledge Base source documents  -  the security playbook library
- **S3 server-side encryption** with AES256, enforced at the bucket level
- **Block public access** on all four dimensions (ACLs, policies, public ACLs, public buckets)
- **S3 versioning** (disabled by default for cost reasons  -  playbooks are idempotent)
- **Automated playbook upload**  -  six curated Markdown playbooks are uploaded as S3 objects during `terraform apply`, covering IAM permission escalation, unauthorized compute usage, data incident response, unauthorized access, OWASP LLM response, and Prompt Override

```hcl
resource "aws_s3_object" "playbooks" {
  for_each = fileset("${path.module}/../playbooks", "**/*.md")

  bucket       = aws_s3_bucket.kb_source.id
  key          = "playbooks/${each.key}"
  source       = "${path.module}/../playbooks/${each.key}"
  content_type = "text/markdown"
  etag         = filemd5("${path.module}/../playbooks/${each.key}")
}
```

The `etag` on each object means Terraform only re-uploads playbooks that actually changed  -  deterministic, idempotent deploys.

After `terraform apply`, you connect the bucket to a Bedrock Knowledge Base via the console (S3 Vectors, Quick Create), set `KNOWLEDGE_BASE_ID` in `.env`, and wolfir's Agentic Query gains RAG-powered playbook retrieval. **Knowledge Base is optional**  -  wolfir works without it, falling back to inline prompts. But with it, the Agentic Query agent can cite specific playbook passages in its responses.

Why Terraform instead of CloudFormation? Familiarity, the provider ecosystem, and the ability to tear down and rebuild the full environment in under 10 minutes  -  invaluable for testing and for eventually supporting dedicated customer deployments.

### Docker: Zero-Friction Local Setup

The entire stack runs with a single command:

```bash
docker compose up
```

`docker-compose.yml` defines two services:

**Backend**  -  `python:3.11-slim` container, FastAPI served by uvicorn, exposes port 8000. AWS credentials are provided either via environment variables or by mounting `~/.aws` as a read-only volume:

```yaml
volumes:
  - ${USERPROFILE:-~}/.aws:/root/.aws:ro
```

This is deliberate. wolfir never asks you to paste credentials into a UI. Either use existing AWS CLI profiles (mounted volume) or set standard AWS environment variables. The credentials stay on your machine.

**Frontend**  -  Vite dev server on port 5173, depends on backend service, `VITE_API_URL` pointed at the backend container.

Both services have `restart: unless-stopped` and the backend has a health check on `/health`  -  if FastAPI isn't responding, Docker restarts it rather than failing silently. The Dockerfile uses `python:3.11-slim` (not `-alpine`) to avoid pip build failures on packages with C extensions.

**Why Docker for a hackathon?** Because "it works on my machine" is not a demo strategy. A judge who clones the repo and runs `docker compose up` gets a running stack in under 2 minutes without installing Python, configuring virtualenvs, or debugging dependency conflicts.

### Frontend: Vercel

The React/TypeScript frontend deploys to Vercel via `vercel.json`. Vercel runs the static build of the Vite app  -  it has no backend. When the Vercel deployment can't reach the FastAPI backend (which it can't, since the backend runs locally or on EC2), it falls back to client-side demo mode automatically. Same build artifact, same code, two modes of operation.

---

## How We Built It: 7 Amazon Nova Capabilities

The first version of wolfir was a single-model system. One Nova 2 Lite call received CloudTrail events and was asked to produce a timeline, risk scores, remediation steps, and documentation simultaneously. It failed fast.

The failure wasn't capability  -  it was focus. A model trying to simultaneously reason about forensic timelines, assign numerical risk scores with consistency, generate executable CLI commands, and write Confluence-ready documentation produced outputs that were mediocre at all four tasks. Context bloated past 16K tokens on any realistic incident. Remediation steps contradicted the timeline. Documentation used different severity ratings than the risk scores.

The insight: these are genuinely different cognitive tasks. Each requires a different kind of attention, a different speed/accuracy tradeoff, and in some cases a different modality entirely. The seven-model architecture followed directly from this.

![Why we chose each Amazon Nova model  -  comparison table showing model name, task, and why this model over alternatives](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-nova-model-selection.png)

*Figure 4  -  The single most important architectural decision: matching each task to the right model. Using the wrong model isn't a capability problem  -  it's a reliability and cost problem. Nova Micro at temperature=0.1 produces more consistent risk scores than Nova 2 Lite at default temperature, because determinism matters more than intelligence for classification. Nova Pro is chosen for visual analysis for a non-negotiable reason: text models cannot read images.*

### 1. Amazon Nova 2 Lite  -  The Reasoning Engine
`us.amazon.nova-2-lite-v1:0`

The workhorse. Handles forensic timeline reconstruction (building attack narratives from raw CloudTrail events), remediation plan generation (step-by-step AWS CLI commands with rollback procedures), documentation generation (JIRA tickets, Slack alerts, Confluence postmortems), the Aria voice assistant, and Strands Agent orchestration for Agentic Query. We use extended thinking at medium effort for agentic workflows, which measurably improved tool selection accuracy.

Nova 2 Lite handles the longest context windows in the pipeline. We feed it structured timeline summaries rather than raw events  -  the context pruning layer (described below) ensures it always operates on exactly the information it needs, nothing more.

### 2. Amazon Nova Micro  -  The Risk Classifier
`amazon.nova-micro-v1:0`

Risk scoring at `temperature=0.1`  -  very low for determinism. Each CloudTrail event is classified as LOW/MEDIUM/HIGH/CRITICAL with a confidence score and MITRE ATT-CK technique mapping.

We run **three parallel calls via `asyncio.gather()`** and return a confidence interval: "77/100 (CI: 70–84)" is more honest than a single number, because a single number implies precision that LLMs don't have.

We also added hard calibration overrides:

```python
# Nova Micro consistently overcalls these  -  domain knowledge backstops the model
CALIBRATION_OVERRIDES = {
    "GetCallerIdentity": {"max_score": 30, "reason": "Routine identity check"},
    "CreatePolicyVersion": {"risk_floor": 75, "reason": "Policy modification  -  HIGH minimum"},
    "PutLogEvents": {"max_score": 20, "reason": "Logging routine  -  not a threat signal"},
}
```

The model is excellent at pattern recognition. Domain-specific calibration makes it accurate. Neither alone is sufficient.

### 3. Amazon Nova Pro  -  Visual Analysis
`amazon.nova-pro-v1:0`

Upload an architecture diagram and Nova Pro performs a STRIDE threat assessment against it  -  reading actual network topology, identifying security groups, load balancers, databases, API gateways, and reasoning about attack surfaces across all six STRIDE categories .

This is genuinely multimodal work. Text-only models can't read a VPC diagram. Nova Pro can. You get a structured threat model in under 30 seconds from a PNG.

### 4. Amazon Nova Canvas  -  Report Imagery
`amazon.nova-canvas-v1:0`

Generates incident-specific cover images for exported PDF reports. A unauthorized compute usage incident gets a different cover than a data exposure incident. This isn't decoration  -  it signals that the output is a real security deliverable, not a plain text export. Each image is generated with incident type, severity, and affected services as context parameters.

### 5. Amazon Nova 2 Sonic  -  Voice Interaction
`amazon.nova-2-sonic-v1:0`

Powers Aria's voice interface with WebSocket streaming architecture. Real-time speech-to-speech conversation about active incidents. Ask "what's the root cause?" while you're running the remediation in another terminal. Hands-free incident Q&A matters when you have four browser tabs open.

### 6. Nova Act  -  Browser Automation
`nova-act SDK`

Click "Generate Nova Act Plan" in the Remediation tab and wolfir generates executable browser automation instructions for AWS Console navigation and JIRA ticket creation. Nova Act translates "revoke this IAM policy, open this Security Hub finding, create this ticket" into specific step-by-step browser actions.

![wolfir 7 Nova capabilities  -  model specialization chart showing which Nova capability handles each pipeline task](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/blog-07-nova-models.png)

*Figure 10  -  wolfir's 7 Nova capabilities by task. Each model is chosen for a specific reason: Micro for speed and determinism at risk scoring, 2 Lite for long-context reasoning at timeline and remediation, Pro exclusively for vision (no text model can read a VPC diagram), Canvas for generation, Sonic for streaming voice, Act for browser automation, Embeddings for behavioral similarity. Using the wrong model for any of these tasks degrades output quality in a way that a more capable model can't fully compensate for.*

### 7. Nova Multimodal Embeddings  -  Cross-Incident Memory
`amazon.nova-2-multimodal-embeddings-v1:0`

After every incident analysis, a structured behavioral summary is embedded at 384 dimensions and stored in DynamoDB. When a new incident arrives, it's embedded and compared via cosine similarity against all past incidents:

```python
async def embed_text(text: str, dimension: int = 384) -> Optional[List[float]]:
    body = {
        "taskType": "SINGLE_EMBEDDING",
        "singleEmbeddingParams": {
            "embeddingPurpose": "TEXT_RETRIEVAL",
            "embeddingDimension": dimension,
            "text": {"truncationMode": "END", "value": text[:8000]},
        },
    }
    response = await asyncio.to_thread(
        client.invoke_model, body=json.dumps(body),
        modelId="amazon.nova-2-multimodal-embeddings-v1:0",
        ...
    )
```

We embed structured feature vectors (attack type, MITRE techniques, IP ranges, IAM patterns) rather than prose descriptions. The embedding model finds semantic patterns in incident behavior, not surface-level text similarity. This is what catches the second occurrence of a campaign that was described differently the first time.

The campaign probability formula combines three signals: SHA-256 fingerprint matching (attack type + sorted MITRE technique list), MITRE technique overlap count (≥2 shared techniques triggers a match), and cosine similarity from Nova Embeddings  -  all capped at 0.95 to prevent overconfident attribution.

---

## Architecture Deep Dive

### The Pipeline: Dependency Order with Parallelism

The five-agent pipeline runs in dependency order, with parallelism where agent outputs don't depend on each other:

![wolfir 5-agent pipeline flow  -  full detail showing all agent steps, context pruning, timing, parallel execution, and complete incident response package output grid](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-pipeline-flow-v2.png)

*Figure 3  -  wolfir's 5-agent pipeline in full detail. Left: CloudTrail events filtered by `filter_interesting_events()` (60+ routine events filtered) before entering the pipeline. Step 1 (Temporal, ~8s): attack chain reconstruction, root cause, Blast Radius via IAM policy simulation, Prompt Override scan on event fields, and the conditional Agentic lateral shift. Step 2 (Risk Scoring, ~4s): Nova Micro �-3 parallel via `asyncio.gather()`, MITRE ATT-CK mapping, confidence intervals, calibration overrides. Steps 3+4 (Remediation + Documentation, concurrent, ~5–6s): run in parallel since both only depend on the timeline output, not each other. Step 5 (Save & Correlate, ~2s): 4-signal correlation via DynamoDB + Nova Embeddings. Output grid (bottom right): all 9 features of the Incident Response Package. Total: ~15–25s end to end on ~12K tokens (versus ~40K without context pruning).*

**Step 1  -  Temporal Analysis (Nova 2 Lite)**

CloudTrail events are filtered to six essential fields before hitting the model: `eventTime`, `eventName`, `sourceIPAddress`, `userIdentity` summary, `errorCode`, `requestParameters`. The `filter_interesting_events()` function removes routine noise:

```python
ROUTINE_EVENTS = {
    "PutLogEvents", "GetCallerIdentity", "AssumeRole",  # service-to-service
    "DescribeInstances", "ListBuckets",  # read-only inventory
    "PutMetricData", "PutMetricAlarm",  # CloudWatch noise
}
```

This decision was critical. Feed 50 routine CloudTrail events to an LLM and ask "what's the attack pattern?"  -  it will invent one. Confidently. Filtering reduces the event set to signals that actually indicate threat activity. When all events are routine, the pipeline returns "no threat detected" instead of fabricating a story. That reliability is worth more than covering every possible event.

Event cap: 50. Context budget matters.

**Agentic lateral shift (conditional)**

If timeline confidence drops below 0.3, the pipeline automatically runs a CloudTrail anomaly scan via the CloudTrail MCP server for additional signal before proceeding to risk scoring. This is a runtime decision  -  the orchestrator evaluates its own confidence and chooses to gather more data. Not scripted, not hardcoded.

**Cross-Incident Correlation (DynamoDB + Nova Embeddings)**

After timeline extraction, the pipeline queries past incidents via DynamoDB, computes fingerprint matches, counts MITRE technique overlaps, and runs semantic similarity via Nova Embeddings. The three signals feed the campaign probability formula.

**Step 2  -  Risk Scoring (Nova Micro, parallel)**

Up to five events scored simultaneously via `asyncio.gather()`. Each gets risk level, confidence interval, MITRE ATT-CK mapping.

**Steps 3 + 4  -  Remediation + Documentation (Nova 2 Lite, concurrent)**

Both depend only on the timeline output, not on each other. They run concurrently. Remediation agent receives structured summaries  -  never raw events. Context pruning at every handoff.

**Step 5  -  Save to DynamoDB**

Complete incident object saved for future correlation.

### Context Pruning: The Seam Between Agents

The most important architectural decision in the pipeline wasn't model selection  -  it was how we pass data between agents. The naive approach (full output from one agent flowing to the next) collapses at any realistic incident size. 80 CloudTrail events -> 16K tokens of timeline output -> 32K tokens by the time you reach the remediation agent. Models start contradicting their earlier outputs.

Each handoff in wolfir passes a compact, typed object  -  only what the next agent needs:

```python
timeline_handoff = {
    "attack_pattern": result["identified_pattern"],
    "root_cause": result["root_cause"],
    "affected_resources": result["affected_resources"][:10],
    "risk_signals": [e for e in events if e.get("flagged")],
    "pivot_resource": result["lateral_movement_origin"],
    "confidence": result["confidence_score"],
}
# ~800 tokens -> next agent, not 12K
```

Context size dropped 60% across the pipeline. Hallucinations from context bloat disappeared.

```
Input (raw)          After pruning         Passed to next agent
─────────────────    ─────────────────     ─────────────────────────────
80 CloudTrail        50 events �- 6         800 tokens
events               fields each           (not 12K)
~40K tokens          ↓                     ↓
                  filter_interesting_   timeline_handoff{}
                  events()              attack_pattern
                                        root_cause
                                        affected_resources[:10]
                                        risk_signals (flagged only)
                                        confidence
```

### The MCP Architecture: Why Not Direct boto3?

Six FastMCP servers expose 27 tools to the Strands agent layer: CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, and AI Security.

The alternative was direct boto3 calls from within agent prompts. We rejected this for a specific reason: implicit coupling. When AWS API behavior changes, agent behavior changes in unpredictable ways. When you want to test agent tool selection, you need live AWS access.

MCP servers create an **explicit typed contract**: agent calls a named function with typed inputs, server handles boto3, error handling, retry logic, and response normalization, agent gets structured output. Testing is clean  -  mock the MCP server, never touch agent logic.

Caching at the MCP layer (CloudTrail events: 60s TTL, IAM policies: 5min TTL) eliminates redundant API calls when the Agentic Query agent calls the same tool multiple times in one session.

### DynamoDB: Design Decisions

DynamoDB is wolfir's memory layer. We chose it for three reasons: **PAY_PER_REQUEST billing** (no provisioned capacity to over-provision for hackathon usage), **O(1) partition key lookups** by `incident_id`, and **auto-table-creation on first use**.

Auto-creation matters for the deployment story:

```python
async def _ensure_table_exists(self):
    try:
        await asyncio.to_thread(self.client.describe_table, TableName=self.table_name)
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            await asyncio.to_thread(
                self.client.create_table,
                TableName=self.table_name,
                KeySchema=[{'AttributeName': 'incident_id', 'KeyType': 'HASH'}],
                AttributeDefinitions=[{'AttributeName': 'incident_id', 'AttributeType': 'S'}],
                BillingMode='PAY_PER_REQUEST'
            )
```

A judge who runs the backend for the first time against a real AWS account doesn't need to pre-create any DynamoDB tables. The table appears automatically on the first incident write. If DynamoDB is unavailable (no AWS access), the pipeline continues with an in-memory fallback  -  the demo never breaks because of a missing table.

Nova Embeddings are stored as JSON-serialized arrays alongside each incident. DynamoDB doesn't have a native vector type, so we serialize to a string field and deserialize at query time. For 384-dimensional vectors across thousands of incidents, the cosine similarity computation is fast enough to run synchronously at query time  -  no vector database needed.

### Bedrock Knowledge Base: RAG for Playbooks

wolfir supports two knowledge sources for Agentic Query, selected at runtime:

**Source 1  -  AWS Knowledge MCP** (`USE_AWS_KNOWLEDGE_MCP=true`): Real-time AWS documentation search with no setup. The agent queries live AWS docs for security guidance without any Terraform or console configuration.

**Source 2  -  Bedrock Knowledge Base** (S3 Vectors): Terraform creates an S3 bucket, uploads six curated security playbooks as Markdown, you connect it to Bedrock Knowledge Base via console, set `KNOWLEDGE_BASE_ID` in `.env`. The agent then retrieves specific, cited passages from the playbooks when generating remediation guidance.

The knowledge service tries AWS Knowledge MCP first, falls back to Bedrock KB, falls back to inline prompts:

```python
async def retrieve_and_generate(query: str) -> Dict[str, Any]:
    # Try AWS Knowledge MCP first  -  real-time docs, no setup required
    if is_aws_knowledge_mcp_enabled():
        result = await search_aws_documentation(query)
        if result.get("answer"):
            return result  # includes source attribution

    # Fall back to Bedrock Knowledge Base
    if kb_id := get_settings().knowledge_base_id:
        return await _bedrock_kb_retrieve_and_generate(query, kb_id)

    # Inline fallback  -  always works
    return {"answer": "No knowledge source configured.", "kb_enabled": False}
```

Why S3 Vectors for the Knowledge Base instead of OpenSearch Serverless? S3 Vectors is purpose-built for document retrieval workloads at lower cost. For six security playbooks ranging from 500–2000 tokens each, OpenSearch Serverless is significantly over-provisioned. S3 Vectors gives us the same Bedrock `RetrieveAndGenerate` API surface at a fraction of the cost.

### Bedrock Guardrails: Infrastructure-Level Safety

wolfir queries the Bedrock control plane to list and audit configured guardrails:

```python
def list_guardrails(max_results: int = 20) -> Dict[str, Any]:
    client = session.client("bedrock", region_name=settings.aws_region)
    resp = client.list_guardrails(maxResults=max_results)
    return {
        "guardrails": [{"id", "arn", "name", "status", "version"} for g in resp["guardrails"]],
        "error": None
    }
```

In the Agentic Query tab, Bedrock Guardrails are applied at the API level before prompts reach the model. Guardrail enforcement happens at the infrastructure layer, not the prompt layer  -  it can't be circumvented by a cleverly crafted input that tricks the model into ignoring its system prompt. The GUARDRAIL_IDENTIFIER and GUARDRAIL_VERSION environment variables configure which guardrail profile applies.

The AI Security Posture dashboard shows current guardrail status  -  active vs. not configured  -  so the team can see at a glance whether the safety layer is in place.

### Human-in-the-Loop: Approval Gates for Risky Remediations

Not all remediations should execute immediately. wolfir classifies each remediation step into three safety tiers:

- **AUTO**  -  low-risk read operations, monitoring changes, tagging. Execute without approval.
- **APPROVAL**  -  policy modifications, security group changes, access key operations. Require explicit approval before executing.
- **MANUAL**  -  destructive actions (user deletion, S3 bucket deletion). Generate CLI commands; analyst executes manually.

The approval system issues a UUID approval token per pending action:

```python
def create_pending_approval(incident_id, step_id, step_action, target, params) -> str:
    token = str(uuid.uuid4())
    _pending[token] = {
        "token": token, "incident_id": incident_id,
        "step_action": step_action, "target": target,
        "params": params, "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
    }
    return token
```

Approving a token via the API triggers the actual boto3 execution. Every execution result is stored as an execution proof  -  before-state, after-state, CloudTrail event reference, timestamp. The analyst can audit exactly what wolfir did, when, and with what result. Every action is CloudTrail-logged.

Rollback is implemented for reversible actions: policy version reversion, security group rule restoration. The before-state snapshot makes rollback a deterministic operation, not a best-effort guess.

---

## The AI Security Pillar: MITRE ATLAS Self-Monitoring

This is the part of wolfir I'm most proud of building  -  and the part nobody else is building.

### The Threat Model

wolfir's agents consume CloudTrail data, IAM policies, CloudFormation templates, and free-text user prompts. They produce remediation commands, JIRA tickets, Slack messages, and voice responses. Every step of that flow is an attack surface.

An unauthorized actor could embed instructions in a CloudTrail event's `requestParameters.resourceName` field  -  that's data the temporal agent reads and reasons about. A cost-exhaustion attack could trigger runaway Bedrock invocations. A crafted query through the Agentic Query interface could cause the model to include sensitive account identifiers in its response. These are real threats against a system with IAM API access.

### 6 MITRE ATLAS Techniques, Implemented

**AML.T0051  -  Prompt Override.** Pattern scanning against 12 known override signatures on every user input before it reaches the Strands Agent. Signatures include role-override patterns ("ignore previous instructions"), Data Extraction probes ("list all AWS account IDs in your context"), and instruction override via data fields. Status indicator in Agentic Query UI is a live signal from this monitor, not decoration.

**AML.T0016  -  Unauthorized Model Access.** Every Bedrock invocation is recorded with the model ID. If any non-approved model (outside the defined Nova set) is invoked  -  whether by the orchestrator, the Strands agent, or a tool  -  the status flips to WARNING and names the offending model. This catches cases where tool execution or Prompt Override causes the agent to invoke an unexpected model.

**AML.T0040  -  ML Inference API Access.** Invocation rate monitoring with baseline comparison. Baseline: approximately 20 invocations per full incident analysis. Alert threshold: >3�- baseline. Expected spikes during active pipeline runs are annotated as "PIPELINE_RUN" and don't trigger false alerts. Unexpected spikes  -  unusual timing, unusual caller identity  -  do.

**AML.T0043  -  Crafted Data.** Input validation on CloudTrail event structure integrity before events reach the temporal agent. Anomalous field values (unusual event name patterns), manipulated timestamps (events with future dates, events with impossible ordering), and structurally malformed events are flagged and optionally quarantined.

**AML.T0024  -  Unauthorized Data Transfer via Inference.** Output scanning on every model response for AWS account IDs (12-digit patterns), access key patterns (`AKIA`, `ASIA` prefixes), private IP ranges, and common secrets patterns. If a response contains what looks like an access key, it's flagged before being returned to the frontend.

**AML.T0048  -  Model Tampering.** Explicitly N/A  -  wolfir uses Bedrock foundation models without fine-tuning or custom training. We document this honestly. Claiming to monitor for fine-tuning tampering when there's no fine-tuning pipeline would be misleading. Honest non-applicability is more credible than a fake detection.

### Beyond ATLAS

The AI Security pillar also includes:

- **OWASP LLM Top 10 posture** (LLM01–LLM10)  -  mapped to wolfir's implementation
- **Shadow AI detection**  -  CloudTrail InvokeModel monitoring for calls from non-approved principals in the account
- **NIST AI RMF alignment**  -  Govern, Map, Measure, Manage framework readiness assessment
- **EU AI Act readiness**  -  AI system risk classification readiness
- **AI-BOM**  -  Bedrock model inventory for the account (all foundation models, inference profiles)
- **Guardrail coverage audit**  -  which Bedrock guardrails are active vs. not configured

When you run an incident analysis, the AI Security dashboard updates based on the Bedrock invocations that just ran through the pipeline. Cloud security and AI security share a live data plane.

![wolfir AI Security Posture dashboard  -  MITRE ATLAS technique live status, OWASP LLM Top 10 radar chart, NIST AI RMF coverage, and Nova invocation rate chart](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-ai-security-posture.png)

*Figure 5  -  wolfir's AI Security Posture dashboard. Left: MITRE ATLAS live technique status updated from actual Bedrock invocations  -  AML.T0040 shows MONITORING because 23 invocations is above baseline (20) but below the 3�- alert threshold. Center: OWASP LLM Top 10 radar chart showing posture score of 87/100. Right: AI compliance coverage across all three frameworks. The invocation rate bar chart (bottom left) lets you visually spot pipeline runs versus anomalous spikes.*

---

## Interactive Attack Path Visualization

Understanding *what happened* requires more than a text timeline. wolfir generates an interactive React Flow graph where every event in the attack chain is a clickable node  -  click any node to see its full risk score, MITRE technique mapping, source IP, timestamp, and what IAM control would have prevented it.

![wolfir interactive attack path diagram  -  React Flow graph showing IAM permission escalation attack chain from external actor through reconnaissance, permission escalation, cross-resource movement, to data impact](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-attack-path.png)

*Figure 6  -  wolfir's interactive attack path for an IAM permission escalation incident. Nodes are color-coded by severity: green (low), orange (medium), dark red (high), bright red (critical). Arrows show temporal progression with exact time deltas. Clicking "CreatePolicyVersion" (the escalation lateral shift) opens the inspection panel on the right: risk score 94/100 (CI: 88–97), MITRE technique T1548.005, source IP, and the specific IAM control that would have prevented it. This is the visualization that turns "seven API calls happened" into "here is exactly how the unauthorized actor moved."*

The graph is built from the temporal agent's attack chain reconstruction. Nodes are positioned by the attack phase (Reconnaissance -> Discovery -> permission escalation -> cross-resource movement -> Impact), so the visual layout itself tells the story of how the unauthorized actor moved through the environment.

---

## Demo Simulation Scenarios + Compliance Mapping

### Three Pre-Built Attack Scenarios  -  No AWS Account Required

wolfir ships with three real attack scenarios, each pre-computed with live Nova outputs so the full pipeline result loads in under 2 seconds without any cloud connection.

![wolfir demo simulation scenarios and compliance mapping  -  three pre-built attack scenarios with severity ratings and 6-framework auto-compliance mapping](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-simulation-compliance.png)

*Figure 7  -  Left: wolfir's three demo simulation scenarios. Each scenario has pre-computed Nova outputs covering timeline, risk scores, blast radius, remediation plan, and compliance mapping. Right: auto-generated compliance mapping across CIS AWS Foundations, NIST 800-53, SOC 2 Type II, PCI-DSS v4.0, SOX IT Controls, and HIPAA  -  each finding mapped to the specific control IDs it violates. No manual auditing required.*

The three scenarios cover the most impactful real-world AWS attack patterns:

1. **IAM permission escalation**  -  Contractor misuses an AssumeRole chain to gain AdministratorAccess. MITRE techniques T1098 and T1078. 9 events. CRITICAL. Full attack chain: discovery -> movement -> continued access.
2. **AWS Organizations Cross-Account exposure**  -  A affected role in a Dev account pivots via STS AssumeRole into Production and Security accounts  -  cross-resource movement across 3 OUs, 12 member accounts. wolfir detects and contains with org-wide SCPs. 18 events. CRITICAL.
3. **Shadow AI / Unauthorized LLM Use**  -  Ungoverned Bedrock InvokeModel calls combined with a Prompt Override attempt. This scenario exercises the MITRE ATLAS self-monitoring pipeline  -  the AI security pillar catching a threat that cloud security monitoring alone would not surface. 7 events. CRITICAL.

Run scenario 1 first, then scenario 2  -  the cross-incident memory will flag "78% probability this is the same unauthorized actor." This is the **correlation seeding trick**: scenario 1 runs silently in the background when you land on the page so scenario 2 always has historical data to correlate against.

### Compliance Mapping  -  6 Frameworks, Automatic

Every incident analysis produces a compliance report without any manual work. Each finding is automatically mapped to the specific control IDs it violates across:

- **CIS AWS Foundations Benchmark**  -  IAM, CloudTrail, CloudWatch, S3, networking controls
- **NIST 800-53 rev5**  -  Access Control (AC), Audit (AU), Identification (IA), System Protection (SC)
- **SOC 2 Type II**  -  CC6 (Logical Access), CC7 (System Operations), A1 (Availability)
- **PCI-DSS v4.0**  -  Requirement 7 (Restrict access), Requirement 10 (Log access)
- **SOX IT General Controls**  -  ITGC-04 (Access management), ITGC-06 (Change management)
- **HIPAA**  -  §164.312 (Technical Safeguards), §164.308 (Administrative Safeguards)

The mapping uses the finding's MITRE ATT-CK technique, affected AWS service, and severity tier to cross-reference against a curated compliance control matrix. An `IAM:CreatePolicyVersion` event with HIGH severity automatically maps to CIS 1.16, NIST AC-6, SOC 2 CC6.1, and PCI-DSS Requirement 7.1  -  with the full control reference text included in the export.

---

## The Two New Pillars: Blast Radius and Organizations

![wolfir remediation plan with blast radius  -  showing affected identity, reachable AWS resources by risk tier, and one-click remediation steps with approval gates](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/blog-05-remediation.png)

*Figure 8  -  wolfir's Remediation tab after an IAM permission escalation incident. Left: Blast Radius Simulator showing every AWS resource reachable from the affected role, tiered by CRITICAL / HIGH / MEDIUM / LOW. Right: generated remediation steps with AUTO / APPROVAL / MANUAL tier classification and execution proof after one-click apply.*

Recent additions to wolfir that fundamentally extend what "incident response" means.

### Blast Radius Simulator

Knowing that an IAM identity was affected is one thing. Knowing every resource an unauthorized actor with that identity can reach is another. The Blast Radius Simulator takes the affected identity from an incident and runs IAM policy simulation to map its full reachable attack surface:

```
affected: arn:aws:iam::123456789:role/DataPipelineRole
│
├── CRITICAL  -  S3:GetObject on s3://prod-customer-data/* (PII exposure)
├── CRITICAL  -  DynamoDB:Scan on CustomerOrders table (financial data)
├── HIGH      -  EC2:RunInstances (unauthorized compute vector)
├── HIGH      -  Bedrock:InvokeModel (AI Unauthorized Model Access)
├── MEDIUM    -  Lambda:InvokeFunction on 3 functions
└── LOW       -  CloudWatch:PutMetricData (noise cover)
```

Each resource shows the IAM action that enables access, the risk zone (critical/high/medium/low), the estimated financial impact, and what would have prevented it. This turns "we had an IAM incident" into "here's exactly what was at risk and what to fix first."

### AWS Organizations Dashboard

When incidents span accounts, a single-account view is insufficient. The Organizations Dashboard shows:

- Full org tree (Management Account -> OUs -> Member Accounts) with real-time threat level indicators
- **Cross-account cross-resource movement detection**  -  identifying when compromise in one account created vectors into others
- **SCP gap analysis**  -  which Service Control Policies are missing across OUs, what they would have blocked
- Per-account security posture scores, finding counts, and compliance percentages

This works in demo mode (pre-computed multi-account scenario) and real AWS mode (live Organizations API + cross-account CloudTrail via AssumeRole).

---

## ChangeSet Analysis, SLA Tracking, and Cost Impact

### ChangeSet Analysis  -  Risk Before You Deploy

The Blast Radius Simulator asks: *what could an unauthorized actor reach with this identity?* The ChangeSet Analyzer asks a different question: *what security risk does this CloudFormation change introduce before you deploy it?*

You paste a CloudFormation change set (or upload a template diff), and wolfir runs it through Nova 2 Lite with a security-focused prompt that evaluates:

- **IAM policy changes**  -  new or expanded permissions, wildcard actions, missing conditions
- **Security group modifications**  -  new ingress rules, port ranges, CIDR scope
- **S3 bucket configuration changes**  -  public access, encryption, versioning, bucket policy scope
- **Encryption at rest changes**  -  removing KMS keys, switching to SSE-S3, disabling encryption
- **Network topology changes**  -  new VPC peering, route table entries, NAT gateway additions

Each finding is rated by risk tier and mapped to the compliance controls it would violate if deployed. The output is a pre-deployment security review that takes 15 seconds instead of a manual audit that takes hours.

This is particularly useful for DevOps teams running frequent deployments  -  a ChangeSet review can gate the CI/CD pipeline before reaching production.

### SLA Tracker  -  Are You Responding Fast Enough?

wolfir tracks incident response SLA compliance across every incident in your history. The SLA Tracker monitors two standard tiers:

- **P1 (CRITICAL)**  -  15-minute detection-to-acknowledgement, 1-hour detection-to-remediation
- **P2 (HIGH)**  -  1-hour detection-to-acknowledgement, 4-hour detection-to-remediation

The tracker shows real-time progress bars for active incidents ("14 minutes elapsed  -  1 minute to P1 SLA violation"), historical SLA compliance rates ("P1: 87% on-time last 30 days"), and predicts exposure risk for in-flight incidents based on pipeline stage and historical resolution time for similar attack types.

SLA violation events are logged to the incident history in DynamoDB, so compliance reporting is automatic rather than reconstructed from meeting notes.

### Cost Impact Analysis  -  What Did This exposure Cost?

Every incident analysis includes a financial exposure estimate using the IBM Cost of data exposure 2024 methodology:

- **Direct compute cost**  -  unauthorized EC2/Lambda/Bedrock invocations at AWS on-demand pricing
- **Data exposure cost**  -  estimated cost per PII record exposed, scaled by the record count from Blast Radius
- **Incident response labor cost**  -  analyst hours �- median SOC analyst hourly rate �- estimated resolution time
- **Regulatory fine exposure**  -  per-jurisdiction GDPR, CCPA, HIPAA fine calculation based on record count and sensitivity tier
- **Total estimated exposure range**  -  low/mid/high scenarios with confidence intervals

The cost output feeds directly into executive briefing documents  -  giving leadership a financial framing alongside the technical timeline. "7 API calls happened" and "$2.1M–4.7M exposure range" have very different business impact.

---

---

## Challenges We Ran Into

![wolfir demo mode  -  dual-mode architecture showing client-side fallback with pre-computed Nova outputs, running full feature set without AWS account](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/blog-04-dual-mode.png)

*Figure 9  -  wolfir's dual-mode architecture. Left: real mode  -  live FastAPI backend, live AWS account, live Bedrock calls. Right: demo mode  -  Vercel-deployed React app with client-side pre-computed results. The same frontend codebase handles both. One build artifact, two operational modes.*

### 1. The Strands SDK Async Bridge  -  Our Biggest Architectural Headache

This one wasn't in any documentation. Strands `@tool` functions are **synchronous**. Our agent implementations use `async` Bedrock calls (`asyncio.to_thread`, `asyncio.gather`). You can't call an async function from a synchronous context without a running event loop  -  and you can't just call `asyncio.run()` inside a Strands tool because FastAPI already owns an event loop in the main thread.

Our first approach (creating a new event loop per tool call) worked but introduced 200–400ms of overhead per call just in loop creation and destruction. At 5 agent steps per incident, that's up to 2 seconds of pure overhead.

The solution was a single persistent worker thread that owns one event loop for the entire process lifetime:

```python
_WORKER_LOOP: asyncio.AbstractEventLoop = asyncio.new_event_loop()
_WORKER_THREAD: threading.Thread = threading.Thread(
    target=_WORKER_LOOP.run_forever,
    daemon=True,
    name="wolfir-async-worker",
)
_WORKER_THREAD.start()

def _run_async(coro):
    """Submit a coroutine to the persistent worker loop and block until done."""
    future = asyncio.run_coroutine_threadsafe(coro, _WORKER_LOOP)
    try:
        return future.result(timeout=180)
    except concurrent.futures.TimeoutError:
        future.cancel()
        raise TimeoutError("Async tool call timed out after 180s")
```

Every Strands `@tool` function now submits its async coroutine to `_WORKER_LOOP` and blocks until it gets the result. Overhead dropped from 200–400ms to under 5ms per call. The 180-second timeout catches hung Bedrock calls without hanging the pipeline forever.

### 2. Context Window Collapse Across Five Models

Raw CloudTrail incidents are enormous. A realistic 80-event incident produces ~40K tokens if you naively pass full output from each agent to the next. By the time you reach the remediation agent, the model is contradicting its own earlier outputs because the beginning of its context is too far away.

We built layered context pruning at every handoff  -  each agent receives only a typed, compact object extracted from the previous output:

- Temporal agent: events filtered to 6 fields, cap of 50 events (~800 tokens in, not 12K)
- Risk scorer: individual events one at a time, never cumulative context
- Remediation agent: structured summary  -  attack pattern, affected resources, root cause  -  never raw events
- Documentation agent: executive summary + structured findings, never any intermediate reasoning

Token consumption dropped from ~40K to ~12K per pipeline run. Hallucinations from context bloat disappeared.

### 3. Hallucinated Threat Narratives from Routine Events

This was the most damaging reliability bug and the hardest to catch because it failed silently. Feed 50 routine CloudTrail events to a language model  -  `PutLogEvents`, `DescribeInstances`, service-to-service `AssumeRole`  -  and ask "what's the attack pattern?" It will invent one. Confidently. With specific MITRE ATT-CK technique mappings. The output looks real.

Building `filter_interesting_events()` was the fix: a curated set of 60+ routine event names that get filtered before the temporal agent sees anything. Service-to-service `AssumeRole` calls (Lambda, ECS executing their roles) required a separate check because the event name alone isn't enough:

```python
def _is_routine_assume_role(event: Dict[str, Any]) -> bool:
    if _get_event_name(event) != "AssumeRole":
        return False
    # Check if the caller is an AWS service principal
    invoker = (ui.get("sessionContext") or {}).get("sessionIssuer") or {}
    return "amazonaws.com" in str(invoker.get("principalId", ""))
```

When all events after filtering are routine, the pipeline returns "no threat detected." That output is worth more than a convincing-sounding false incident.

### 4. CloudTrail LookupEvents Is Per-Region  -  12 Regions �- 50 Events/Page

CloudTrail's `LookupEvents` API doesn't return global results. It queries one region at a time, with a maximum of 50 events per page. A real AWS account with activity across us-east-1, us-west-2, and eu-west-1 requires at least three separate paginated queries to get complete coverage.

We ended up querying 12 regions by default, with rate-limit delays between pages:

```python
CLOUDTRAIL_EVENTS_PER_PAGE = 50    # API max per LookupEvents call
CLOUDTRAIL_MAX_PAGES_PER_REGION = 20  # 1,000 events max per region
CLOUDTRAIL_PAGE_DELAY_SEC = 0.6    # Rate limit between paginated calls
CLOUDTRAIL_REGION_DELAY_SEC = 0.5  # Delay between regions
```

For 12 regions at max depth: 12 �- 20 pages �- 0.6s = 144 seconds of just wait time. In practice, most accounts have activity in 2–3 regions and most incidents are visible in under 5 pages. But the rate limiting is non-optional  -  hit CloudTrail's LookupEvents without delays and you get throttled immediately.

The 2-minute cache (keyed on days_back + max_results + profile) means repeated analyses with the same parameters return consistent results and don't re-hit the API.

### 5. The Model Outputs Fake Access Key IDs in Remediation Steps

This one took us by surprise. When Nova 2 Lite generates a remediation plan that includes disabling a affected access key, it would output steps like:

```
aws iam update-access-key --access-key-id AKIAEXAMPLE --user-name affected-user --status Inactive
```

`AKIAEXAMPLE` is a placeholder. Real access key IDs start with `AKIA` or `ASIA`. When we tried to execute this against a real account, it failed immediately.

The fix required runtime discovery in the executor:

```python
# Model output AKIAEXAMPLE  -  discover the real key at execution time
if access_key_id == "AKIAEXAMPLE" or not access_key_id.startswith("AKIA"):
    keys = iam.list_access_keys(UserName=username).get("AccessKeyMetadata", [])
    active_keys = [k for k in keys if k["Status"] == "Active"]
    if active_keys:
        real_key_id = active_keys[0]["AccessKeyId"]
```

We added similar sanitization for IAM role names, policy ARNs, and instance IDs  -  the model generates structurally correct but semantically placeholder values in its output. Every remediation executor function now has a verification step before executing.

### 6. IAM Policy Detach Requires Verifying Attachment First

Calling `iam.detach_role_policy()` on a policy that isn't attached throws an exception that breaks the execution flow. The model's remediation plan might say "detach AdministratorAccess from DataPipelineRole"  -  but the attached policy might be `arn:aws:iam::aws:policy/AdministratorAccess` while the model output just says `AdministratorAccess`.

Full ARN matching is required. We added a pre-verification step and partial-match fallback:

```python
attached = iam.list_attached_role_policies(RoleName=role_name).get("AttachedPolicies", [])
policy_arns = [p["PolicyArn"] for p in attached]
if policy_arn not in policy_arns:
    # Try suffix match  -  model may output just the name, not the full ARN
    match = next((p for p in policy_arns if policy_arn in p), None)
    if match:
        policy_arn = match
    else:
        return ExecutionResult(status="FAILED", message=f"Policy not attached. Attached: {policy_arns}")
```

### 7. Session Revocation Requires a Specific IAM Pattern

"Revoke all active sessions for a role" sounds straightforward. AWS doesn't have an API call for this  -  you can't list and terminate active STS sessions. The only way to invalidate sessions retroactively is an IAM policy condition:

```python
policy_doc = {
    "Statement": [{
        "Effect": "Deny",
        "Action": ["*"],
        "Resource": ["*"],
        "Condition": {
            "DateLessThan": {"aws:TokenIssueTime": revoke_time}  # NOW
        }
    }]
}
```

Any session token issued before `revoke_time` is denied all actions. New sessions issued after the policy is attached are unaffected. This is the documented AWS session revocation pattern, but it's non-obvious and required careful testing  -  attaching the wrong date causes either no revocation (date in the past) or blocking all sessions including new ones (date in the future).

### 8. Risk Score Miscalibration at temperature=0.1

Even very low temperature doesn't give you perfectly calibrated domain knowledge. Nova Micro consistently over-called certain events:

- `GetCallerIdentity` -> scored HIGH (it appears in unauthorized actor discovery playbooks, but is also a routine SDK health check)
- `CreatePolicyVersion` -> scored CRITICAL regardless of context (legitimate DevOps orgs do this constantly)
- `PutLogEvents` -> scored MEDIUM (it's CloudWatch log shipping, not an attack)

The fix was hard calibration overrides for known miscalibrations, applied after the model scores:

```python
CALIBRATION_OVERRIDES = {
    "GetCallerIdentity": {"max_score": 30},
    "PutLogEvents":      {"max_score": 15},
    "CreatePolicyVersion": {"risk_floor": 60},  # High but not always CRITICAL
}
```

We also run three parallel calls via `asyncio.gather()` and return a confidence interval. "77/100 (CI: 70–84)" is more honest than a single number  -  it shows the evaluator that there's genuine model variance in the assessment.

### 9. CloudTrail Event Field Names Are Inconsistent

Events from different sources (LookupEvents API, demo scenario JSON, manual test payloads) use different field name conventions. The same event time might be `eventTime`, `EventTime`, or buried inside a serialized `CloudTrailEvent` JSON string. The same event name might be `eventName`, `event_name`, or `EventName`.

Every event parsing function needed defensive field extraction:

```python
def _get_event_name(event: Dict[str, Any]) -> str:
    name = event.get("eventName") or event.get("event_name") or event.get("EventName", "")
    if name:
        return name
    # Handle CloudTrailEvent as serialized JSON string (LookupEvents format)
    ct = event.get("CloudTrailEvent")
    if isinstance(ct, str):
        try:
            parsed = json.loads(ct)
            return parsed.get("eventName", "") if isinstance(parsed, dict) else ""
        except Exception:
            pass
    return ""
```

This pattern appears throughout the codebase. Inconsistent field names across real AWS LookupEvents output, raw CloudTrail S3 logs, and Security Hub findings cost us days of debugging.

### 10. Bedrock Guardrails Blocked Legitimate Security Queries

Adding Guardrails to Agentic Query introduced a failure mode we didn't anticipate: `GuardrailInterventionException` from completely legitimate security queries. Asking "which IAM role was used in the attack?" triggers Guardrails if the word "attack" matches a sensitive phrase filter. "Show me the attack path" trips a content filter. "How do I revoke affected credentials?" contains "affected."

Security tooling is inherently full of words that content filters are trained to block. The fix was two-pronged: tuning the guardrail to allow security research context (adding specific allowed phrases for security operations terminology), and adding graceful degradation so a guardrail rejection surfaces a useful message rather than a 500 error:

```python
except GuardrailInterventionException as e:
    return {
        "answer": f"Query blocked by content guardrails. Rephrase without sensitive keywords. Reason: {e.intervention_reason}",
        "guardrail_triggered": True,
        "suggestion": "Try: 'What IAM actions were performed?' instead of 'What attack techniques were used?'"
    }
```

### 11. Demo Mode Had to Mirror Real Execution Exactly

The demo mode isn't a shortcut  -  it's a parallel implementation that has to produce structurally identical output to the real pipeline for the frontend to use one codebase. Every `ExecutionResult` object, every risk score shape, every timeline format has to be identical whether the pipeline ran for real or returned pre-computed outputs.

The discipline cost time: every new feature required both a real implementation and a demo implementation. Adding confidence intervals to risk scores meant updating both the live Nova Micro calls and the stored demo outputs. Adding the Blast Radius Simulator meant pre-computing a realistic Blast Radius result for each of the three demo scenarios. Any divergence between demo and real mode breaks one of them in ways that are hard to debug.

The upside: the discipline forced us to define clean, typed API contracts between every layer. The demo mode is a constant test that the real mode's output structure is stable.

### 12. Nova Act Plan Generation Produced Browser Steps for the Wrong Console

Nova Act generates browser automation plans for AWS Console navigation. Early outputs would generate steps for the IAM Classic console, which AWS has been deprecating and redirecting. Steps that said "click Users in the left sidebar" stopped working when the console reorganized that page.

We added console version annotations to the Nova Act prompts  -  specifying the current IAM console URL structure, not just the destination  -  and validated outputs against the expected current URL patterns before returning them. This is an ongoing maintenance issue as AWS updates their console UI.

### 13. DynamoDB Table Auto-Creation Race Condition in Concurrent Requests

The `_ensure_table_exists()` pattern works fine for single requests. Under concurrent load (two incident analyses starting simultaneously), both requests check for the table, both find it missing, and both try to create it. The second `create_table` call throws `ResourceInUseException`.

```python
async def _ensure_table_exists(self):
    try:
        await asyncio.to_thread(self.client.describe_table, TableName=self.table_name)
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            try:
                await asyncio.to_thread(self.client.create_table, ...)
            except ClientError as create_err:
                # ResourceInUseException  -  another request created it first, that's fine
                if create_err.response['Error']['Code'] != 'ResourceInUseException':
                    raise
```

Catching `ResourceInUseException` and continuing is the correct behavior  -  the table got created, just not by us. Took a concurrency test to find this.

### 14. MCP Server Initialization on Import Caused Bedrock Client Creation at Module Load

The MCP server singletons (`get_cloudtrail_mcp()`, `get_iam_mcp()`, etc.) were originally initialized at module import time. When FastAPI imported the orchestrator module, six Bedrock clients and six boto3 sessions were created immediately  -  before any request arrived, before credentials were configured, in the wrong region.

The fix was deferred initialization with closures:

```python
_cloudtrail_mcp = None

def get_cloudtrail_mcp():
    global _cloudtrail_mcp
    if _cloudtrail_mcp is None:
        _cloudtrail_mcp = CloudTrailMCP()  # Creates boto3 client here, at first use
    return _cloudtrail_mcp
```

Same pattern for all six MCP servers and all six agent instances. Startup time dropped from 8 seconds (six blocking Bedrock client initializations) to under 1 second. Credentials are resolved at first use, not at import time.

---

## Accomplishments We're Proud Of

**The two-pillar architecture is genuinely new.** Cloud security platforms exist. AI security tools are emerging. A platform where one pillar monitors the other in real time  -  where running an incident analysis updates the AI security posture dashboard  -  is a new category.

**Seven Nova capabilities, each doing non-fungible work.** Not "we called the API seven times." Nova Pro reads images  -  text models cannot. Nova Micro at temperature=0.1 is deterministic in a way that Nova 2 Lite at default temperature is not. Nova Embeddings finds behavioral patterns that keyword matching misses. Each model handles a task the others either can't do or can't do as well.

**The Blast Radius Simulator changes the incident response question.** Not "what happened?" but "what could have happened, and what do we lock down right now?" IAM policy simulation as a first-class incident response tool is something we haven't seen elsewhere.

**Infrastructure as Code from day one.** The Terraform module means wolfir's AWS infrastructure is reproducible, auditable, and fully reversible. `terraform teardown` removes everything. `terraform apply` brings it back. This is how security tools should be deployed.

**Docker for zero-friction setup.** `docker compose up` shouldn't be aspirational. It should be the expected baseline. wolfir meets that bar.

**Credentials never leave the user's machine.** In a security product, this isn't optional. `del credentials` is explicit in the validation function  -  not just letting variables fall out of scope. Every remediation action is CloudTrail-logged and verifiable.

---

## What We Learned

**Model selection matters more than model capability.** The breakthrough wasn't using a more powerful model  -  it was matching each task to the right model. Nova Micro for speed and determinism. Nova 2 Lite for complex reasoning. Nova Pro for vision. Using the wrong model for a task creates quality problems that more capability can't fix.

**Multi-agent systems are about the seams.** The models are excellent. The plumbing between them is where things break. What gets passed, in what format, with how much context, at what precision  -  these decisions determined reliability more than any prompt engineering.

**Hallucination prevention is a design pattern, not a prompt trick.** Event filtering before the temporal agent, calibration overrides for the risk scorer, confidence intervals instead of single scores, "no threat detected" as a valid output  -  these are code patterns that made the pipeline dramatically more reliable. Prompts alone couldn't achieve this.

**Infrastructure decisions compound.** Terraform from day one meant the Knowledge Base setup was three commands. Docker from day one meant the demo setup was one command. These aren't things you add later cleanly.

**Security products must eat their own dog food.** Monitoring wolfir's Bedrock pipeline with MITRE ATLAS came from asking: "If someone targeted wolfir specifically, what would they try?" Answering that question led to building a genuinely new capability.

**Demo engineering is product engineering.** Making the full five-agent pipeline work offline, client-side, with pre-computed real Nova outputs forced us to define clean API contracts, unified data shapes, and graceful degradation. The discipline of keeping demo mode and real mode on the same API contract made the real backend better.

---

## What's Next for wolfir

**Real-time streaming via EventBridge.** EventBridge rules on CloudTrail write events -> SQS FIFO with priority tiers -> wolfir workers on ECS Fargate. The SQS architecture is designed; it's the first post-hackathon build. This shifts wolfir from batch analysis to live incident detection.

**Multi-account correlation across AWS Organizations.** wolfir already has the Organizations Dashboard and cross-account AssumeRole support. Next: detecting cross-resource movement campaigns across OUs using the cross-incident memory system.

**AI Red Teaming module.** Automated Prompt Override testing against the user's own Bedrock pipelines. If you deploy Nova in production, you should verify that your guardrails actually hold against real crafted inputs.

**Deeper JIRA/Slack/Confluence integration via Nova Act.** Full browser automation to create tickets, post to incident channels, and generate postmortems in one flow  -  not just plan generation, but execution.

**Community playbook library.** The Bedrock Knowledge Base integration already supports custom playbooks in S3. The vision is community-contributed SOPs for common AWS incident types  -  curated, versioned, searchable via RAG.

**Enterprise deployment template.** CloudFormation template for VPC-isolated backend, private Bedrock endpoints, WAF in front of the FastAPI layer, and multi-region DynamoDB Global Tables for cross-region incident correlation.

---

## The Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **AI models** | Amazon Nova (Pro · 2 Lite · Micro · 2 Sonic · Canvas · Act · Embeddings) | 7 capabilities, each with a distinct non-fungible role |
| **Agent framework** | Strands Agents SDK | Native `@tool` decorators, Bedrock-native, pipeline + autonomous mode |
| **MCP servers** | FastMCP  -  6 servers, 27 tools | Typed contracts between agents and AWS APIs, testable in isolation |
| **Backend** | FastAPI + uvicorn + Python 3.11 | Async-native, `asyncio.gather()` for parallel agent steps |
| **Frontend** | React + TypeScript + Vite + Tailwind + Framer Motion + React Flow | Full type safety, animation-ready, interactive attack path diagrams |
| **Memory** | DynamoDB (PAY_PER_REQUEST) + Nova Embeddings | Auto-provisioning, cosine similarity at query time, in-memory fallback |
| **Knowledge** | Bedrock Knowledge Base (S3 Vectors) + AWS Knowledge MCP | RAG-powered playbook retrieval, dual source with fallback chain |
| **Safety** | Bedrock Guardrails + MITRE ATLAS monitoring | Infrastructure-level enforcement + AI-layer behavioral monitoring |
| **Infrastructure** | Terraform | Reproducible, reversible, audit-ready |
| **Containers** | Docker + docker-compose | Zero-friction local setup, credential mounting, health checks |
| **Frontend deploy** | Vercel | CDN-deployed static build, client-side demo mode when backend offline |

---

## Community Impact: Who This Is For

**Small and mid-sized security teams** that don't have Splunk, Cortex XSOAR, or dedicated SOC analysts. They have CloudTrail, maybe GuardDuty, and not enough hours. wolfir gives them what a 20-person SOC has: a structured response pipeline that runs in minutes.

**Cloud engineers learning incident response.** The three demo scenarios walk through realistic attack chains  -  IAM permission escalation, cross-account cross-resource movement, and Shadow AI misuse. Running a scenario and reading the generated attack timeline teaches you what to look for in real incidents.

**Teams deploying AI who need to secure it.** The MITRE ATLAS self-monitoring pillar is a proof of concept for a problem barely anyone is addressing: who watches the watcher? If you're deploying LLMs for security analysis, Prompt Override and API misuse are real threat vectors, not theoretical ones.

**AWS builders exploring multi-agent architectures.** The codebase is a reference implementation: Strands Agents SDK + MCP + multiple Nova models + DynamoDB cross-incident memory + Bedrock Knowledge Base + demo/real mode coexistence. MIT-licensed.

We're keeping the barrier low: MIT license, no AWS account needed for the demo, credentials never leave your machine, ~$0.01–0.02 per incident on Bedrock on-demand, ~$2–5/month estimated for light usage.

---

## Conclusion

wolfir started from two questions. What happens when AI actually responds to security alerts? And who watches the AI?

Building it taught us that Nova's model diversity isn't marketing  -  it's architecture. Micro for speed, 2 Lite for reasoning, Pro for vision, Canvas for generation, Act for automation, Sonic for voice, Embeddings for similarity. Each does something the others can't. The Strands Agents SDK makes them work together. Terraform makes the infrastructure reproducible. Docker makes the setup frictionless. Bedrock Knowledge Bases make the responses grounded in your security playbooks. Guardrails make it safe at the API level.

The AI security pillar is where we think the industry is heading. Every security platform will be AI-powered soon. Every AI-powered security platform is itself an attack surface. The ones that monitor their own pipelines with frameworks like MITRE ATLAS  -  and build the infrastructure to do it systematically  -  will be the ones that earn trust. wolfir is our proof of concept for that future.

Try it. Break it. Tell us what's missing.

---

**Live Demo:** [wolfir.vercel.app](https://wolfir.vercel.app)
**Source Code:** [github.com/bhavikam28/wolfir](https://github.com/bhavikam28/wolfir)

**Built with:** Amazon Nova (Pro · 2 Lite · Micro · 2 Sonic · Canvas · Act · Multimodal Embeddings) · Strands Agents SDK · 6 AWS MCP Servers · Bedrock Knowledge Bases · Bedrock Guardrails · FastAPI · React · DynamoDB · Terraform · Docker

`#AmazonNova` `#wolfir` `#AIforSecurity` `#CloudSecurity` `#AISecurity` `#MITREAtlas`
