/**
 * Blog content for wolfir website
 */

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
}

export const BLOGS: BlogPost[] = [
  {
    id: '01',
    title: 'From 11,000 Alerts to Zero Noise: How wolfir Uses 5 Nova Models',
    excerpt: 'Security teams get 11,000+ alerts per day. We built wolfir to change that — an agentic pipeline that produces a full incident response package in minutes.',
    content: `If you've ever been on call at 2am with a Security Hub alert blinking and no idea where to start, you know the problem. Security teams receive an average of **11,000 alerts per day** according to the Ponemon Institute. They investigate less than 5%. The rest? They drown in noise, get triaged by whoever's awake, or slip through the cracks entirely.

We built wolfir to change that. Not with another dashboard. Not with another rule engine. With an **agentic pipeline** that takes raw CloudTrail events, runs them through five Amazon Nova models and services, and produces a complete incident response package in minutes: chronological timeline, attack path visualization, risk scores, remediation plan with real AWS CLI commands, and documentation ready for JIRA, Slack, or Confluence.

This is the story of how we got there — and why it took five models instead of one.

## The Gap We're Closing

Existing tools detect. They don't respond. A SIEM tells you *something* happened. A SOAR can automate, but it's brittle and rule-based. When a new attack pattern emerges, your playbooks break. What we wanted was an AI that could:

- **Correlate** events across time and resources — connecting an IAM assumption at 4am to a security group change at 4:15am to an EC2 launch at 4:38am
- **Reason** about root cause and blast radius — understanding that the contractor role was the pivot point, not just flagging "suspicious activity"
- **Classify** severity in under a second — so analysts know whether to wake up the CISO or add it to the backlog
- **Generate** remediation steps with real AWS CLI commands — not generic advice, but \`aws iam detach-role-policy --role-name contractor-temp\`
- **Document** for audit and handoff — so the next shift knows exactly what happened and what was done

That's not one model's job. We use five Nova models plus Nova Act, each chosen for what it does best. Nova Pro reads architecture diagrams. Nova Micro scores risk. Nova 2 Lite reasons over timelines and writes remediation. Nova Canvas generates report covers. Nova Act plans browser automation for AWS Console and JIRA.

## Why Five Models Instead of One

We tried a single-model approach first. It failed. One model trying to do detection, investigation, classification, remediation, and documentation produced inconsistent outputs and hallucinated AWS API calls. We'd get remediation steps that referenced non-existent resources. We'd get timelines that contradicted the event timestamps. We'd get risk scores that didn't match the severity of the actions.

Splitting the pipeline across specialized models — each with a narrow, well-defined task — gave us deterministic, auditable results. Nova Micro is fast and cheap for classification; we use it for high-volume, low-complexity decisions. Nova 2 Lite handles the heavy reasoning: building timelines, tracing kill chains, writing remediation. Nova Pro parses architecture diagrams when we have visual context. The orchestration layer (Strands Agents SDK) passes context between them, so each model gets exactly what it needs — no more, no less.

## The Architecture in Practice

When a CloudTrail event set arrives, the pipeline runs in sequence. First, the temporal agent (Nova 2 Lite) builds a chronological timeline and identifies the attack pattern. That output flows to the risk scorer (Nova Micro), which assigns a 0–100 score to each event. Those scores inform the remediation agent (Nova 2 Lite again), which generates steps with API calls. The documentation agent produces JIRA, Slack, and Confluence-ready content. If we have an architecture diagram, Nova Pro enriches the analysis with visual context.

The whole thing takes about 45 seconds with the full backend. Or 2 seconds in instant demo mode — we pre-compute results for judges who want to see the output without waiting.

## The Challenge: Making It Real

The hardest part wasn't the AI. It was making the system **actually work** end-to-end. Orchestrating five models with shared state. Keeping credentials secure (never stored, never transmitted). Handling 12 CloudTrail regions. Making demo mode work without a backend so anyone can try it on Vercel. And monitoring our own AI pipeline with MITRE ATLAS — because who protects the AI?

We also had to handle failure modes. What if the backend is unreachable? Client-side fallbacks. What if a model times out? Graceful degradation. What if the user has no CloudTrail events? A friendly empty state: "Your account is quiet! Try 30 days or a different region."

## What We Learned

Demo mode had to work without a backend. We built client-side fallbacks so the Vercel deployment runs end-to-end even when the API isn't running. Judges can try it in 30 seconds. For full AI, they run the backend locally. Credentials stay on the user's machine — we never store or transmit them. That zero-trust approach was non-negotiable for security teams.

The 11,000-alert statistic isn't marketing fluff. It's from the Ponemon Institute's Cost of Data Breach Report. The 5% investigation rate is real. We're not claiming to solve alert fatigue overnight — but we're giving analysts a head start. From signal to resolution, with the AI doing the heavy lifting.`,
  },
  {
    id: '02',
    title: 'The Hard Parts of Multi-Agent Security Orchestration',
    excerpt: 'Orchestrating five Nova models plus an autonomous agent sounds simple. In practice, it\'s a maze of state management, tool selection, and failure modes.',
    content: `Orchestrating five Nova models plus an autonomous agent sounds simple on paper. In practice, it's a maze of state management, tool selection, and failure modes. Here's what we learned building wolfir.

## Challenge 1: Shared State Across Agents

Each agent (Detect, Investigate, Classify, Remediate, Document) needs context from the previous step. **What we did:** Strands Agents SDK with a single orchestration run. State flows through the pipeline as a shared context object.

**Gotcha:** Token limits. Passing a 50-event timeline plus remediation steps can blow context. We truncate strategically and use structured outputs.

## Challenge 2: Tool Selection Without Hallucination

The Agentic Query agent picks from 23 MCP tools across five AWS servers. **What we did:** Pattern matching on user intent plus Strands tool descriptions. Fallbacks: if the agent doesn't know, it says so instead of guessing.

## Challenge 3: Latency and Cost

Five Nova calls per incident. Plus embeddings. **What we did:** Nova Micro for classification (fast, cheap). Nova 2 Lite for heavy reasoning. Parallel calls where possible.

## Challenge 4: Credentials and Security

We never store AWS credentials. **What we did:** Profile-based auth. Demo mode with client-side fallbacks. Credentials stay on the user's machine.`,
  },
  {
    id: '03',
    title: 'Who Protects the AI? MITRE ATLAS and wolfir\'s Self-Monitoring',
    excerpt: 'If your security platform is powered by AI, who watches the AI? We built wolfir to monitor its own pipeline using MITRE ATLAS.',
    content: `If your security platform is powered by AI, who watches the AI? Prompt injection, API abuse, data exfiltration — these aren't theoretical. We built wolfir to monitor its own pipeline using MITRE ATLAS.

## Six Techniques We Monitor

- **AML.T0051** — Prompt injection: Pattern matching + Nova Micro classification
- **AML.T0016** — Capability theft: Model access audit
- **AML.T0040** — API abuse: Rate monitoring, baseline comparison
- **AML.T0025** — Adversarial inputs: Input validation
- **AML.T0024** — Data exfiltration: Output validation
- **AML.T0044** — Model poisoning: N/A (we use foundation models)

Each technique has a status: CLEAN, WARNING, or ALERT. We surface this in the AI Pipeline Security tab — transparent view into our own posture.

## Integration with Bedrock Guardrails

MITRE ATLAS is one layer. Amazon Bedrock Guardrails add another: content filters, prompt-attack blocking, PII masking. We recommend both. Defense in depth.

## The Challenge: False Positives

Aggressive pattern matching can flag legitimate inputs. We tuned thresholds and use Nova Micro for a second opinion. When in doubt, we log and continue — we don't block the analyst.`,
  },
  {
    id: '04',
    title: 'Real AWS vs. Demo Mode: How wolfir Works With and Without Your Account',
    excerpt: 'wolfir has two modes: Demo (no AWS) and Console (real AWS). Both use the same UI and pipeline. The difference is where the data comes from.',
    content: `wolfir has two modes: **Demo** (no AWS) and **Console** (real AWS). Both use the same UI and pipeline. The difference is where the data comes from.

## Demo Mode: Zero Setup

Click "Try Demo," pick a scenario. No AWS account. No credentials. The frontend can even work when the backend is offline — we built client-side fallbacks.

**What you get:** Full 5-agent pipeline, timeline, attack path, compliance mapping, cost impact, Aria, report export.

**Limitation:** Sample data. It's a preview of the product.

## Console Mode: Real AWS

Connect via AWS CLI profile or SSO. Credentials stay on your machine.

**What you get:** Real CloudTrail from 12 regions, real IAM analysis, Security Hub findings, cross-incident memory, one-click remediation, Agentic Query against live AWS data.

## The Challenge: Bridging Both

We wanted demo mode to feel identical to real mode. Same tabs, same flow. Unified API contract. Graceful degradation. Clear indicators: "Demo Mode" vs. "Live AWS Analysis."`,
  },
  {
    id: '05',
    title: 'Remediation, Nova Act, and Human-in-the-Loop',
    excerpt: 'wolfir doesn\'t just recommend fixes. It can execute them — with CloudTrail proof and one-click rollback. Here\'s how we balance automation with safety.',
    content: `wolfir doesn't just recommend fixes. It can execute them. IAM policy attachment, security group changes, resource tagging — with CloudTrail proof and one-click rollback.

## The Remediation Pipeline

1. **Nova 2 Lite** generates remediation steps
2. **Nova Micro** classifies each step: Auto-Execute, Human Approval, or Manual Only
3. **Remediation Executor** applies approved steps via boto3
4. **CloudTrail** confirms every action
5. **Rollback** — One click to undo

High-risk actions are never auto-executed. Medium-risk require explicit approval.

## Nova Act: Beyond API

Some fixes aren't API calls. Creating a JIRA ticket. Opening the AWS Console. Nova Act generates *plans* for these actions. We output step-by-step instructions.

## The Challenge: Blast Radius

A remediation step can have unintended effects. We mitigate by: explicit approval for IAM/security groups, before/after snapshots, rollback commands, demo mode simulation.

## Human-in-the-Loop as a Feature

We could auto-execute everything. We don't. Security decisions need human judgment. Our job is to make the manual fix fast — one click, with full context — not to remove the human.`,
  },
];
