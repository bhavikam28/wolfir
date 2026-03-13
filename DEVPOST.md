# wolfir — DevPost Submission

---

## Inspiration

Security teams receive 11,000 alerts per day. They investigate less than 5% (Ponemon Institute). The gap isn't detection — it's response. Existing tools tell you *something* happened. They don't tell you what to do, and they don't do it for you.

We also noticed a second problem that nobody is solving: every security platform now uses AI, but nobody is securing the AI itself. Prompt injection, API abuse, model theft — MITRE ATLAS has catalogued the threats. Who's monitoring them in production? We decided wolfir would.

So we built two things in one: an autonomous cloud security platform, and an AI pipeline that monitors itself.

## What it does

**wolfir** is an autonomous security platform for AWS that closes two gaps:

**1. Cloud Security — from alert to remediation, autonomously**
- Ingests CloudTrail events and runs a 5-agent Nova pipeline: Detect → Investigate → Classify → Remediate → Document
- Produces a full incident response package in minutes: timeline, attack path diagram, compliance mapping (CIS, NIST 800-53, SOC 2, PCI-DSS, SOX, HIPAA), cost impact with IBM Cost of Data Breach formula, remediation plan with real AWS CLI commands
- Executes remediations via boto3 with CloudTrail confirmation and one-click rollback
- Cross-incident memory (DynamoDB + Nova Embeddings): run two demos — the second shows "78% probability same attacker"
- Agentic Query: a Strands agent that autonomously picks from 23 MCP tools across 6 AWS services (CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, AI Security)

**2. AI Security — wolfir watches itself**
- MITRE ATLAS monitoring: 6 techniques (AML.T0051 Prompt Injection, AML.T0016 Capability Theft, AML.T0040 API Abuse, AML.T0025 Adversarial Inputs, AML.T0024 Data Exfiltration, AML.T0044 Model Poisoning)
- OWASP LLM Top 10 posture — LLM01–LLM10 status
- Shadow AI detection: flags ungoverned Bedrock invocations
- AI Compliance: EU AI Act, NIST AI RMF, NIST CSF 2.0 readiness
- Bedrock Guardrails integration for prompt injection defense

**Nova capabilities used (7):** Nova Pro (visual analysis / STRIDE), Nova 2 Lite (timeline, remediation, docs, voice), Nova Micro (risk classification), Nova 2 Sonic (Aria voice), Nova Canvas (report cover art), Nova Act (browser automation), Nova Multimodal Embeddings (incident similarity).

## How we built it

**Backend:** Python + FastAPI + Strands Agents SDK + boto3. 21 Strands `@tool` functions organized into 6 groups: core Nova pipeline (temporal, risk scorer, remediation, documentation, visual, voice), AWS MCP tools (CloudTrail, IAM, CloudWatch, Security Hub), AI Security MCP (MITRE ATLAS, OWASP, Shadow AI), and Nova Act browser plans.

**Multi-agent architecture:** A Strands orchestrator runs each specialized step as a `@tool` function that calls Bedrock directly. This gives us deterministic pipelines with explicit state handoffs — not a single model trying to do everything.

**MCP protocol:** 6 FastMCP servers expose 23 tools to the Strands agent layer. Each server handles one AWS service domain.

**Frontend:** React + TypeScript + Vite + Tailwind CSS + Framer Motion. Hash-based routing, full client-side demo mode for judges who can't run the backend.

**Demo mode:** Complete client-side fallback — 5 pre-computed demo scenarios (crypto-mining, data exfiltration, privilege escalation, unauthorized access, Shadow AI). Judges on Vercel see full results in 2 seconds; full AI pipeline runs in 30–45 seconds with the backend.

**Security of the product itself:** Rate limiting (SlowAPI, 60 req/min per IP), 500-event cap, 5MB body limit, credentials never stored, all actions logged to CloudTrail, prompt injection protection with MITRE ATLAS + Bedrock Guardrails.

## Challenges we ran into

**Token limits in multi-agent pipelines.** Passing 80 CloudTrail events through five sequential models exhausts context. We built a context pruning layer that passes only what each model needs — the remediation agent never sees raw events, only the structured timeline.

**Tool selection without hallucination.** The Agentic Query agent picks from 23 tools. We added lightweight intent classification (Nova Micro, one-shot) before the agent runs, biasing tool selection without removing autonomy. We also hardened tool descriptions to encode intent, not just capability.

**Demo latency vs. real pipeline.** 30–45 seconds is fast for incident response. It's too slow for a hackathon demo. Solution: pre-compute five scenarios client-side. Vercel shows results in 2 seconds; the backend runs for real when available.

**Securing the AI itself.** MITRE ATLAS technique monitoring is not a checkbox — it's live classification of each Bedrock invocation pattern. We tuned thresholds to reduce false positives while catching real anomalies (external IP accessing Bedrock, unusual streaming patterns).

## Accomplishments we're proud of

- **The two-pillar story.** No other hackathon project we saw secures both cloud infrastructure *and* its own AI pipeline. This is a genuinely new category.
- **7 Nova capabilities, all doing real work.** Not "we used Nova for one thing." Each model has a distinct, non-fungible role.
- **Cross-incident memory.** Run scenario 1, run scenario 2 — see correlation. DynamoDB + Nova Embeddings making a live connection between two attacks.
- **Credentials never leave the user's machine.** In a security product, this matters. Every remediation is CloudTrail-auditable. We eat our own dog food.
- **MITRE ATLAS self-monitoring.** Building a security product that monitors its own AI pipeline against the MITRE ATLAS framework is something that genuinely couldn't exist before Nova.

## What we learned

Multi-agent systems are less about AI capability and more about the seams between agents — what flows where, when, in what format. We also learned that demo mode is a product feature, not a shortcut. Making the full pipeline work offline, client-side, with rich pre-computed results, is engineering work that pays off in judge experience.

Most importantly: securing AI is the next frontier. SIEM/SOAR tools are converging on AI for detection. Who's watching those AI systems? The answer for wolfir is: wolfir itself.

## What's next

- **Real-time CloudTrail streaming** via EventBridge — move from batch to live
- **Multi-account correlation** — connect incidents across AWS organizations
- **AI Red Teaming module** — automated prompt injection tests against the user's own Bedrock pipelines
- **Enterprise deployment** — CloudFormation template for VPC-isolated backend
- **SOC integration** — Direct Slack, PagerDuty, and JIRA webhook output

---

**wolfir: AI that secures your cloud — and secures itself.**

**Tech:** Strands Agents SDK · 6 AWS MCP servers (CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, AI Security) · 23 MCP tools · FastAPI · React · Vite

**#AmazonNova** | **#wolfir** | **#AIforSecurity**

---

## Demo Video Tips

- **Lead with MITRE ATLAS** — Show AI Security Posture first. "This platform monitors itself."
- **Golden path:** 1-Click Demo (crypto-mining) → Run scenario 2 (privilege escalation) → Ask Aria "Have we seen this attack before?" → See "78% same attacker"
- **Two-pillar framing:** Cloud Security Demo → AI Security Posture (MITRE ATLAS, OWASP LLM Top 10)
- **Show the AI pipeline tab** — agent steps with model labels ("Nova 2 Lite · temporal reasoning")
- **Include #AmazonNova hashtag** in video description
