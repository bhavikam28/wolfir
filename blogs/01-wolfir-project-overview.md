# wolfir: When AI Actually Responds to Security Alerts

Security teams get 11,000+ alerts per day. They investigate less than 5%. The rest? Drown in noise, or get triaged by whoever’s awake at 2am. We built wolfir to change that — not with another dashboard, but with an agentic pipeline that takes CloudTrail events, runs them through seven Amazon Nova models and services, and produces a full incident response package: timeline, attack path, risk scores, remediation plan with AWS CLI commands, and documentation ready for JIRA, Slack, or Confluence.

## The Gap We’re Closing

Existing tools detect. They don’t respond. A SIEM tells you something happened. A SOAR can automate, but it’s brittle and rule-based. What we wanted was an AI that could:

- **Correlate** events across time and resources
- **Reason** about root cause and blast radius
- **Classify** severity in under a second
- **Generate** remediation steps with real AWS CLI commands
- **Document** for audit and handoff

That’s not one model’s job. We use five Nova models plus Nova Act, each chosen for what it does best. Nova Pro reads architecture diagrams. Nova Micro scores risk. Nova 2 Lite reasons over timelines and writes remediation. Nova Canvas generates report covers. Nova Act plans browser automation for AWS Console and JIRA.

## How It Works

You connect your AWS account (credentials stay local) or run a demo scenario. The pipeline:

1. **Detect** — Temporal agent correlates CloudTrail events into a timeline
2. **Investigate** — Root cause and kill chain tracing
3. **Classify** — Nova Micro scores severity in &lt;1s
4. **Remediate** — Step-by-step plan with one-click apply
5. **Document** — JIRA tickets, Slack alerts, Confluence post-mortems

Along the way: compliance mapping (CIS, NIST, SOC 2), cost impact estimation, IR protocol adherence (NIST phases), and Aria — a voice assistant that answers “What’s the root cause?” or “Have we seen this before?”

## The Challenge: Making It Real

The hardest part wasn’t the AI. It was making the system **actually work** end-to-end. Orchestrating five models with shared state. Keeping credentials secure (never stored, never transmitted). Handling 12 CloudTrail regions. Making demo mode work without a backend so anyone can try it. And monitoring our own AI pipeline with MITRE ATLAS — because who protects the AI?

We’re not done. But we’re far enough that a SOC analyst can go from alert to remediation plan in minutes, not hours. That’s the goal.
