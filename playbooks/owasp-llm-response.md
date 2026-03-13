# Incident Response Playbook: OWASP LLM Security Top 10

## Overview
This playbook guides response to LLM-related security incidents aligned with the OWASP Top 10 for Large Language Model Applications. Use when prompt injection, data leakage, or other LLM-specific threats are detected.

## OWASP LLM Top 10 Quick Reference
- **LLM01** Prompt Injection — Malicious inputs override model behavior
- **LLM02** Sensitive Information Disclosure — PII, secrets in outputs
- **LLM03** Supply Chain — Compromised models, plugins, training data
- **LLM04** Data and Model Poisoning — Adversarial training data
- **LLM05** Improper Output Handling — Unsanitized outputs cause downstream harm
- **LLM06** Excessive Agency — Agent performs unintended actions
- **LLM07** System Prompt Leakage — System instructions exposed
- **LLM08** Insecure Plugin Design — Plugins with excessive permissions
- **LLM09** Misinformation — Hallucinated or manipulated content
- **LLM10** Model Theft — Unauthorized model extraction

## Detection Indicators
- wolfir OWASP LLM report shows WARNING or ALERT for any category
- Bedrock Guardrails blocking content (check CloudWatch metrics)
- CloudTrail: InvokeModel from unexpected principals (Shadow AI)
- Anomalous model invocation patterns (rate, model ID, region)

## Response Steps

### 1. Containment (Immediate)
- **LLM01/LLM07**: Enable or tighten Bedrock Guardrails (prompt-attack filtering, content filters)
- **LLM02/LLM05**: Disable or restrict model access until output validation is in place
- **LLM06**: Revoke or reduce Bedrock Agent tool permissions; audit IAM roles
- **Shadow AI**: Revoke credentials of unexpected InvokeModel principals

### 2. Investigation
- Review CloudTrail for InvokeModel, InvokeModelWithResponseStream, InvokeAgent
- Check Bedrock Guardrails logs and blocked-content metrics
- Audit Bedrock Agent definitions and tool access
- Inspect system prompts and user inputs for injection patterns

### 3. Eradication
- Rotate credentials for compromised principals
- Update Guardrails with stricter filters
- Remove or restrict insecure plugins/agents
- Patch or replace compromised model endpoints

### 4. Recovery
- Re-enable model access with Guardrails active
- Document lessons learned and update AI security posture
- Run OWASP LLM scan to verify posture_percent improvement

## AWS CLI Commands (Examples)
```bash
# List Bedrock Guardrails
aws bedrock list-guardrails --region us-east-1

# Get Guardrail details
aws bedrock get-guardrail --guardrail-identifier <id> --guardrail-version 1

# List Bedrock Agents
aws bedrock-agent list-agents --region us-east-1
```

## MITRE ATLAS Mapping
- AML.T0051: Prompt Injection (LLM01)
- AML.T0024: Exfiltration via Inference (LLM02)
- AML.T0048: Transfer Learning Attack (LLM04)
- AML.T0040: ML Inference API Access (LLM06, Shadow AI)

## References
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
- [MITRE ATLAS](https://atlas.mitre.org/)
