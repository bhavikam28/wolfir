# AI Security Strategy — wolfir Pivot

**Goal:** Shift wolfir from cloud-centric incident response to **AI Security Posture Management (AI-SPM)**, positioning it as a differentiated player in a market where Wiz (now merged with Google) is the dominant incumbent.

---

## Executive Summary

- **Why now:** AI security is a fast-growing segment; cloud security is saturated. Wiz’s Google merger validates the space.
- **Your edge:** You already have MITRE ATLAS, NIST AI RMF, Bedrock Guardrails, and a multi-agent pipeline. You’re securing your own AI — extend that to securing *customer* AI.
- **Strategy:** Evolve from “incident response for CloudTrail” to “AI Security Posture Management for AWS AI workloads” — Bedrock, SageMaker, MCP, agents, and pipelines.

---

## Part 1: Wiz AI Security — What They Do (Reference)

From the Wiz dashboards and [Wiz AI Security Academy](https://www.wiz.io/academy/ai-security):

| Capability | Wiz Approach | Your Current State |
|------------|--------------|--------------------|
| **AI Security Graph** | Connects models, data, identities, cloud — attack path analysis | Attack path for CloudTrail only; no AI asset graph |
| **OWASP LLM Top 10** | Compliance posture, policy mapping | Not implemented |
| **AI Inventory** | Models, agents, pipelines, datastores | None — you inventory CloudTrail, not AI assets |
| **Shadow AI** | Discover ungoverned AI usage | None |
| **LLM Guardrails** | “Guardrail should protect against Prompt Injections” | Bedrock Guardrails + ATLAS pattern scan (internal pipeline only) |
| **AI Attack Path** | Internet → App Endpoints → EC2 → IAM → S3 → Bedrock Model | CloudTrail attack path only |
| **AI-BOM** | Bill of materials for AI components | None |
| **Agentic AI Threats** | Over-privileged agents, code execution tools, production DB access | None |
| **AI Runtime Security** | Live inference monitoring, prompt injection, model extraction | Static scan only |
| **AI Risk Management** | NIST AI RMF, OWASP, ISO 23894 | NIST AI RMF for *your* pipeline only |
| **Compliance Posture** | OWASP LLM Security Top 10, subcategory status | MITRE ATLAS (6 techniques) for your pipeline |

**Wiz’s core idea:** AI security is about **relationships** — exposure + permissions + data access. A security graph makes those relationships explicit.

---

## Part 2: Your Current Strengths (Leverage These)

| Asset | How to Extend |
|-------|---------------|
| **MITRE ATLAS (6 techniques)** | Add OWASP LLM Top 10; extend from “your pipeline” to “customer AI workloads” |
| **NIST AI RMF** | Keep; add OWASP LLM, ISO 23894, EU AI Act mapping |
| **Bedrock Guardrails** | Extend to customer Bedrock apps; add guardrail recommendation engine |
| **Multi-agent pipeline** | Use as “AI SecOps” — automated investigation, remediation, documentation |
| **Attack Path Diagram** | Add **AI Attack Path** — Internet → API → Bedrock/SageMaker → S3/IAM |
| **Knowledge Base + AWS Knowledge MCP** | Add AI security playbooks (OWASP, prompt injection response, etc.) |
| **Voice Assistant (Aria)** | “Ask Aria about AI security” — natural language AI risk queries |
| **Strands + MCP** | Add AI Security MCP — scan Bedrock models, SageMaker endpoints, MCP servers |

---

## Part 3: Phased Roadmap

### Phase 1 — Foundation (4–6 weeks)

**Theme:** Extend existing AI security to *customer* AI, not just your pipeline.

| Initiative | Description | Effort |
|------------|-------------|--------|
| **1.1 OWASP LLM Security Top 10** | Add OWASP LLM Top 10 as a second framework alongside MITRE ATLAS. Map each of the 10 to detection logic (e.g. LLM01 Prompt Injection → existing `scan_for_prompt_injection`). | Medium |
| **1.2 AI Security Dashboard** | New “AI Security” top-level view (like Wiz). Show: OWASP LLM posture %, MITRE ATLAS status, Guardrail coverage, Top Issues. | Medium |
| **1.3 Bedrock Model Inventory** | MCP tool: `list_bedrock_models` — list custom models, inference profiles. First step to AI-BOM. | Low |
| **1.4 Guardrail Recommendation** | “Guardrail should protect against Prompt Injections” — recommend Bedrock Guardrail config based on model usage. | Low |

**Deliverables:** OWASP LLM Top 10 in UI, AI Security dashboard, Bedrock inventory tool.

---

### Phase 2 — AI Attack Surface (6–8 weeks)

**Theme:** Visibility into AI assets and attack paths.

| Initiative | Description | Effort |
|------------|-------------|--------|
| **2.1 AI Asset Discovery** | Discover: Bedrock models, SageMaker endpoints, Lambda with Bedrock, S3 buckets used for AI training. Use AWS APIs + optional CloudTrail. | High |
| **2.2 AI Attack Path** | New diagram type: Internet → API Gateway / ALB → Bedrock / SageMaker → IAM → S3 / RDS. Reuse `AttackPathDiagram` with AI-specific nodes. | Medium |
| **2.3 Shadow AI Detection** | Flag: Bedrock invocations from unknown apps, SageMaker notebooks without governance, Lambda functions calling Bedrock without guardrails. | Medium |
| **2.4 AI-BOM (Basic)** | Bill of materials: models, datasets (S3), dependencies. Export as JSON/SPDX-like. | Medium |

**Deliverables:** AI inventory, AI attack path visualization, Shadow AI alerts, basic AI-BOM.

---

### Phase 3 — Runtime & Agentic (8–10 weeks)

**Theme:** Runtime security and agentic AI threats.

| Initiative | Description | Effort |
|------------|-------------|--------|
| **3.1 Prompt Injection Defense** | Extend `scan_for_prompt_injection` for customer inputs. Optional: Bedrock Guardrails on customer endpoints. | Medium |
| **3.2 Agentic AI Threat Model** | Map OWASP Agentic AI: excessive agency, state integrity, tool execution, identity misuse. Check: Bedrock Agents with broad IAM, code execution tools. | High |
| **3.3 MCP Security** | “Application endpoint exposing MCP with critical/high vulnerabilities” — scan for exposed MCP servers, validate MCP tool permissions. | Medium |
| **3.4 AI Runtime Monitoring** | CloudWatch metrics for Bedrock invocations, anomaly detection. “Model extraction” detection via unusual query patterns. | High |

**Deliverables:** Agentic AI threat dashboard, MCP security scan, runtime monitoring.

---

### Phase 4 — Compliance & Differentiation (6–8 weeks)

**Theme:** Frameworks, audit, and unique value.

| Initiative | Description | Effort |
|------------|-------------|--------|
| **4.1 Compliance Posture** | Wiz-style: OWASP LLM %, subcategory Passed/Failed, Top Policies with findings. | Medium |
| **4.2 AI Audit Trail** | Log: model invocations, guardrail blocks, prompt injection attempts. Export for compliance. | Medium |
| **4.3 AI Red Teaming** | “Run AI Red Team” — automated prompt injection tests, adversarial inputs. Report pass/fail. | High |
| **4.4 Vibe Coding Security** | [Wiz: Vibe Coding Security Fundamentals](https://www.wiz.io/academy/ai-security) — secure AI-assisted code generation. Add checks for generated code (secrets, unsafe patterns). | Medium |

**Deliverables:** Compliance posture dashboard, audit export, AI red team module, vibe coding checks.

---

## Part 4: Framework Mapping

### OWASP LLM Security Top 10 (2025)

| ID | Name | Your Detection Approach |
|----|------|-------------------------|
| LLM01 | Prompt Injection | `scan_for_prompt_injection` + Bedrock Guardrails |
| LLM02 | Sensitive Information Disclosure | Output validation (existing) + PII detection |
| LLM03 | Supply Chain | AI-BOM, model provenance |
| LLM04 | Data/Model Poisoning | Training data integrity, S3 access audit |
| LLM05 | Improper Output Handling | Output validation |
| LLM06 | Excessive Agency | Agentic AI threat model — IAM, tools |
| LLM07 | System Prompt Leakage | Output scan for system prompt patterns |
| LLM08 | Insecure Plugin Design | MCP tool audit |
| LLM09 | Misinformation | Hallucination / output validation |
| LLM10 | Model Theft | Unusual inference patterns, rate limits |

### NIST AI RMF (Keep)

- **GOVERN:** Multi-agent oversight, approval gates ✅  
- **MAP:** MITRE ATLAS + OWASP LLM ✅  
- **MEASURE:** Risk scoring, invocation monitoring ✅  
- **MANAGE:** Remediation, rollback ✅  

### Additional Frameworks (Later)

- **ISO/IEC 23894:2023** — International compliance  
- **EU AI Act** — High-risk AI, transparency  
- **MITRE ATLAS** — Expand beyond 6 techniques  

---

## Part 5: Technical Architecture (AI Security Layer)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Security Layer (NEW)                        │
├─────────────────────────────────────────────────────────────────┤
│  AI Security MCP Server                                          │
│  ├── list_bedrock_models()                                        │
│  ├── list_sagemaker_endpoints()                                   │
│  ├── scan_mcp_exposure()                                          │
│  ├── get_ai_attack_path()                                         │
│  └── check_guardrail_coverage()                                   │
├─────────────────────────────────────────────────────────────────┤
│  AI Security Service                                              │
│  ├── discover_ai_assets()                                         │
│  ├── build_ai_graph()  ← Security Graph for AI                    │
│  ├── assess_owasp_llm()                                           │
│  └── assess_agentic_threats()                                     │
├─────────────────────────────────────────────────────────────────┤
│  Existing: Strands, Temporal, Risk, Remediation, Doc, Voice       │
│  Existing: CloudTrail MCP, IAM MCP, Security Hub MCP              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Differentiation vs. Wiz

| Dimension | Wiz | wolfir (Proposed) |
|-----------|-----|---------------------------|
| **Focus** | Multi-cloud (AWS, Azure, GCP) | **AWS-native** — Bedrock, SageMaker, MCP |
| **AI Models** | Generic | **Amazon Nova** — first-class support |
| **Incident Response** | Findings, tickets | **Autonomous remediation** — Nova Act, Strands |
| **Voice** | “Ask Mika AI” | **Aria** — voice-first AI security assistant |
| **Pricing** | Enterprise | **SMB / mid-market** — simpler, faster |
| **Openness** | Proprietary | **MCP-first** — extensible, composable |

**Positioning:** “AI Security for AWS — from the team that built incident response on Nova.”

---

## Part 7: Immediate Next Steps (This Sprint)

1. **Add OWASP LLM Top 10** to `ai_pipeline_monitor.py` and `AIPipelineSecurity.tsx` — map LLM01–LLM10 to existing + new checks.  
2. **Rename/reframe** “AI Pipeline Security” → “AI Security Posture” — make it the primary dashboard.  
3. **Create `ai_security_mcp.py`** — first tool: `list_bedrock_models` (custom models, inference profiles).  
4. **Extend playbooks** — add `playbooks/owasp-llm-response.md`, `playbooks/prompt-injection-response.md` for KB.  
5. **Landing page** — shift messaging from “Cloud incident response” to “AI Security for AWS.”

---

## Part 8: References

- [Wiz AI Security Academy](https://www.wiz.io/academy/ai-security)  
- [Wiz AI Security Graph](https://www.wiz.io/academy/ai-security/ai-security-graph)  
- [Wiz Agentic AI Threats](https://www.wiz.io/academy/ai-security/agentic-ai-threats)  
- [Wiz AI Runtime Security](https://www.wiz.io/academy/ai-security/ai-runtime-security)  
- [Wiz Shadow AI](https://www.wiz.io/academy/ai-security/shadow-ai)  
- [Wiz AI Risk Management](https://www.wiz.io/academy/ai-security/ai-risk-management)  
- [Wiz AI-BOM](https://www.wiz.io/academy/ai-security/ai-bom-ai-bill-of-materials)  
- [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/)  
- [MITRE ATLAS](https://atlas.mitre.org/)  
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)  

---

*Document generated from Wiz dashboard analysis and wolfir codebase review. Use as a living strategy document.*
