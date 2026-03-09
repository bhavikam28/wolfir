# Nova Sentinel — DevPost Submission Description

**Copy this for your DevPost project description:**

---

**Built for SOC analysts, cloud security engineers, and incident responders** — including teams using AWS IAM Identity Center (SSO). Security teams get **11,000+ alerts per day** and investigate **<5%**. Nova Sentinel changes that — from alert to resolution, autonomously.

**This is built with 5 Amazon Nova models + Nova Act + Nova Multimodal Embeddings.** Nova Pro for visual architecture analysis, Nova 2 Lite for temporal reasoning and remediation, Nova Micro for ultra-fast risk classification, Nova 2 Sonic for voice (Aria), Nova Canvas for report art, Nova Act for browser automation (AWS Console, JIRA), and Nova Multimodal Embeddings for semantic "find similar incidents" search.

**Key differentiators:**
- **Cross-Incident Memory** — DynamoDB-backed correlation detects attack campaigns. Run two demos — the second says "78% probability this is the same attacker."
- **Nova Act** — Generate browser automation plans for AWS Console remediation and JIRA ticket creation. Plan mode in UI, live mode with SDK.
- **Nova Embeddings** — "Find similar incidents" in Incident History. Semantic search over incident summaries using Nova Multimodal Embeddings.
- **Autonomous Remediation with Proof** — Actually executes AWS API calls. CloudTrail confirmation, one-click rollback.
- **AI Pipeline Self-Monitoring** — "Who protects the AI?" Monitors its own Bedrock pipeline for MITRE ATLAS threats.
- **Agentic Pivot** — When timeline confidence is low, the agent runs CloudTrail anomaly scan before proceeding.

**Tech:** Strands Agents SDK, 5 AWS MCP servers (CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas), 23 MCP tools, 14 Strands @tool functions, FastAPI, React, Vite.

**#AmazonNova** | **#NovaSentinel** | **#AIforSecurity**

---

## Demo Video Tips

- **Record with instant demo mode** for the main flow (no "demo demons")
- **Golden path:** Run scenario 1 → Run scenario 2 → Ask Aria "Have we seen this attack before?" → See correlation
- **Real AWS mode:** Show briefly to prove it's not a mockup
- **Nova 2 Sonic:** Frame positively — "Aria uses Nova 2 Lite for NLU today; Nova 2 Sonic integration-ready for production"
- **Include #AmazonNova hashtag** in video description
