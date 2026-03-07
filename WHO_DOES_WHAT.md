# Nova Sentinel — Who Does What

A simple map of every feature, agent, and tab so you know what everyone does.

---

## THE MAIN FLOW (What Happens When You Run Analysis)

```
You pick a scenario OR connect AWS
        ↓
Pipeline runs automatically (5 steps):
  1. TemporalAgent (Nova 2 Lite) → Builds timeline, root cause, attack pattern
  2. Incident Memory → Correlates with past incidents (campaign detection)
  3. RiskScorerAgent (Nova Micro) → Scores each event 0–100
  4. RemediationAgent (Nova 2 Lite) → Generates step-by-step fix plan
  5. DocumentationAgent (Nova 2 Lite) → JIRA, Slack, Confluence docs
        ↓
Results appear across the tabs
```

---

## SIDEBAR TABS — What Each One Shows

| Tab | What It Does | Data Source |
|-----|--------------|-------------|
| **Security Overview** | Health score, risk metrics, insight cards (root cause, attack pattern, blast radius), correlation alert | Timeline + orchestration results |
| **Incident Timeline** | Chronological list of events with severity | Timeline from TemporalAgent |
| **Attack Path** | Visual diagram of how the attack moved through your infra | Timeline events + MITRE mapping |
| **Incident History** | Past incidents, campaign correlation ("78% same attacker") | DynamoDB (cross-incident memory) |
| **Compliance Mapping** | CIS, NIST, SOC 2, PCI-DSS, SOX, HIPAA — which controls are violated | Timeline + incident type |
| **Cost Impact** | Cost of incident, Nova vs manual cost, savings | Timeline + incident type |
| **Remediation Engine** | Step-by-step fix plan, execute with CloudTrail proof | RemediationAgent |
| **Autonomous Agent** | You type or click a prompt → Agent picks tools (CloudTrail, IAM, etc.) and runs them | Strands Agent (autonomous) |
| **Visual Analysis** | Upload architecture diagram → Nova Pro analyzes it | VisualAgent (Nova Pro) |
| **Aria Voice AI** | Ask questions about the current incident (voice or text) | VoiceAgent (Nova 2 Lite) |
| **Documentation** | JIRA ticket, Slack message, Confluence page | DocumentationAgent |
| **Export Report** | PDF, clipboard, print | All analysis data |
| **AI Pipeline Security** | MITRE ATLAS — monitors the AI pipeline itself | AI Pipeline Monitor |

---

## AGENTS (Backend) — Who Does What

| Agent | Model | Job |
|-------|-------|-----|
| **TemporalAgent** | Nova 2 Lite | Timeline, root cause, attack pattern, blast radius |
| **RiskScorerAgent** | Nova Micro | Risk score 0–100 per event |
| **RemediationAgent** | Nova 2 Lite | Remediation plan with AWS CLI commands |
| **DocumentationAgent** | Nova 2 Lite | JIRA, Slack, Confluence output |
| **VoiceAgent** | Nova 2 Lite | Aria — answers questions about incident |
| **VisualAgent** | Nova Pro | Analyzes uploaded architecture diagrams |
| **Incident Memory** | DynamoDB + Nova | Saves incidents, correlates, campaign detection |
| **Strands Agent** | Nova 2 Lite | Agentic Query — picks and runs tools from your prompt |

---

## MCP TOOLS (What the Agent Can Call)

| Tool | What It Does |
|------|--------------|
| cloudtrail_lookup | Fetch CloudTrail events by category |
| cloudtrail_anomaly_scan | Scan for anomalies |
| iam_audit | Audit IAM users/roles |
| iam_policy_analysis | Analyze a specific IAM policy |
| cloudwatch_security_check | Security alarms, EC2 metrics |
| cloudwatch_billing_check | Billing anomalies |
| securityhub_get_findings | Pre-correlated findings (GuardDuty, Inspector) |
| nova_canvas_generate_report_cover | Generate report cover image |
| query_incident_history | Get past incidents from DynamoDB |

---

## ENTERPRISE FEATURES (AWS Organization & Cross-Account)

| Feature | How to Use |
|---------|------------|
| **Org trail** | Add `?org_trail=true` to `/api/analysis/real-cloudtrail` or `/api/orchestration/analyze-from-cloudtrail` — queries organization trail in management account |
| **Cross-account (AssumeRole)** | Add `?target_role_arn=arn:aws:iam::123456789012:role/NovaSentinelRole` — assumes role before CloudTrail/Security Hub calls |
| **Security Hub** | Agent can call `securityhub_get_findings` — pre-correlated GuardDuty/Inspector findings as pipeline input |

---

## ARIA vs AGENTIC QUERY — When to Use Which

| | **Aria** | **Agentic Query** |
|---|----------|-------------------|
| **When** | After you've run an analysis | Anytime — no analysis needed |
| **Asks** | "What's the root cause?", "Have we seen this before?" | "Audit IAM users", "Scan CloudTrail for anomalies" |
| **Uses** | Current incident context | Picks tools and runs them |
| **Best for** | Understanding an incident | Ad-hoc security checks |

---

## WHAT YOU SHOULD DO (Recommendations)

1. **Demo flow:** Run scenario → Overview → Timeline → Attack Path → Autonomous Agent (click prompt) → Remediation → Aria ("What's the root cause?") → Incident History (run 2nd scenario, see correlation)
2. **Autonomous Agent:** Use to show agent reasoning — click "Investigate IAM roles for privilege escalation"
3. **Keep both Aria and Autonomous Agent** — they serve different purposes (Q&A vs autonomous tool execution)
4. **Visual Analysis:** Optional — upload a diagram to get Nova Pro's take
5. **Export:** Use when you need a PDF or shareable report

---

## QUICK REFERENCE

- **Pipeline** = Automatic (Temporal → Risk → Remediation → Docs)
- **Aria** = Q&A about the incident you just analyzed
- **Autonomous Agent** = You prompt → Agent runs CloudTrail/IAM/CloudWatch/etc.
- **Incident History** = Past incidents + "same attacker?" correlation
