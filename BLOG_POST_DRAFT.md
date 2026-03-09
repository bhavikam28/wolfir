# Nova Sentinel: What Happens When AI Actually Responds to Security Alerts

*Draft for builder.aws.com — use tag Amazon-Nova*

---

## The 2am Problem

You've probably been there. A GuardDuty finding fires at 2am. Your SIEM lights up. Someone has to figure out what happened, trace the kill chain, write up the incident, and get a remediation plan in front of the right people. That someone is usually a tired analyst with a dozen other alerts in the queue.

The tools we have today are great at detecting. GuardDuty, Security Hub, CloudTrail — they surface the signal. But they don't respond. The gap between "we found something" and "we fixed it" is still filled by humans, manually correlating logs, building timelines, drafting runbooks, and hoping nothing slips through.

We built Nova Sentinel to see what happens when you close that gap with AI.

## Not Another Dashboard

Nova Sentinel isn't a dashboard. It's not a SIEM layer. It's an agentic pipeline that takes CloudTrail events (or a demo scenario), runs them through five Amazon Nova models plus Nova Act, and produces a full incident response package: timeline, attack path, risk scores, remediation plan with AWS CLI commands, and documentation ready for JIRA, Slack, or Confluence.

Each model does what it's best at. Nova Pro reads architecture diagrams and spots misconfigurations. Nova 2 Lite builds the timeline and writes the remediation plan. Nova Micro scores risk in under a second. Nova Canvas generates report cover art. Nova Act turns remediation steps into browser automation plans for the AWS Console. And Nova Multimodal Embeddings powers semantic search — "find incidents similar to this one" — so analysts can spot patterns across their history.

## Who It's For

We built this for SOC analysts, cloud security engineers, and incident responders. If you're in an AWS organization using IAM Identity Center (SSO), you can connect your profile and run analysis against real CloudTrail data. No keys on our servers. Everything stays in your account.

We also built it for teams that are understaffed. Security teams get 11,000+ alerts per day and investigate less than 5%. Nova Sentinel doesn't replace judgment — it gives you a head start. A timeline in seconds instead of 45 minutes. A remediation plan with approval gates instead of a blank page.

## The Differentiators

**Cross-incident memory.** Run two demos. The second one says "78% probability this is the same attacker." We store incident summaries in DynamoDB and correlate by fingerprint. Ask Aria, our voice assistant, "have we seen this before?" and get a real answer.

**Remediation with proof.** We don't just suggest steps — we can execute them. Before/after state, CloudTrail confirmation, one-click rollback. Human-in-the-loop for anything risky.

**AI pipeline self-monitoring.** "Who protects the AI?" We monitor our own Bedrock pipeline for prompt injection, API abuse, and data exfiltration using MITRE ATLAS. Six techniques, real-time. NIST AI RMF aligned.

**Semantic similarity.** Nova Multimodal Embeddings let you find incidents that are semantically similar, not just keyword matches. Click the sparkle icon in Incident History and see what's related.

## What We Learned

Building this taught us a few things. First, model selection matters. Nova Micro for risk scoring is fast and deterministic. Nova 2 Lite for reasoning handles the heavy lifting. Throwing one model at everything would have been slower and less accurate.

Second, agentic behavior is real. When timeline confidence is low, our pipeline runs a CloudTrail anomaly scan before proceeding. It pivots. That's not a script — it's the Strands Agent deciding what to do next.

Third, demo mode had to work without a backend. Judges and evaluators need to see the product. We built client-side fallbacks so the Vercel deployment runs end-to-end even when the API isn't running. Instant demo, no setup.

## Day 2 and Beyond

Where could this go? Multi-account analysis at scale. Deeper JIRA/Slack integration via Nova Act. Custom playbooks that learn from your incidents. We're open-sourcing the core so others can extend it.

If you're a SOC team drowning in alerts, or a builder curious what agentic AI looks like in security, give Nova Sentinel a try. The demo is free. Connect your AWS account when you're ready.

---

*Built with Amazon Nova. #AmazonNova*
