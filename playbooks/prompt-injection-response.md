# Incident Response Playbook: Prompt Injection (LLM01 / AML.T0051)

## Overview
Prompt injection occurs when adversaries craft inputs with hidden instructions to override AI model behavior, potentially causing unauthorized actions, data leakage, or system compromise. This playbook guides detection and response.

## Detection Indicators
- wolfir MITRE ATLAS: AML.T0051 status WARNING or ALERT
- Bedrock Guardrails blocking prompt-attack content (CloudWatch metrics)
- Pattern matches: "ignore previous instructions", "you are now", "jailbreak", base64 payloads
- Anomalous model outputs (revealing system prompts, executing unintended commands)

## Response Steps

### 1. Containment (Immediate)
- Enable Bedrock Guardrails with prompt-attack filtering if not already active
- Block or quarantine the specific input source (API, user, IP) if identified
- Temporarily restrict model access for affected applications

### 2. Investigation
- Review CloudTrail for InvokeModel events from the time of detection
- Inspect request payloads for injection patterns (see INJECTION_PATTERNS in ai_pipeline_monitor)
- Check Bedrock Guardrails logs for blocked content
- Identify which model, agent, or application was targeted

### 3. Eradication
- Update Guardrails with additional blocked phrases or content filters
- Sanitize user inputs before passing to models (length limits, pattern filtering)
- Rotate any credentials that may have been exposed via model output

### 4. Recovery
- Re-enable model access with strengthened Guardrails
- Add output validation to detect system prompt leakage
- Document injection patterns for future detection tuning

## Prevention
- **Defense in depth**: Bedrock Guardrails + application-level input validation
- **Output validation**: Scan model responses for PII, secrets, system prompt fragments
- **Least privilege**: Limit Bedrock Agent tool permissions; avoid broad IAM policies
- **Monitoring**: Use wolfir AI Security Posture dashboard for ongoing AML.T0051 status

## AWS Resources
- [Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
- [Content filters](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-content-filters.html)

## MITRE ATLAS
- **AML.T0051**: Adversarial Prompt Engineering
