"""
AI Security Service — AWS AI asset discovery, Bedrock inventory, OWASP LLM assessment.
Part of wolfir's AI Security Posture Management (AI-SPM) for AWS.
"""
import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from utils.config import get_settings
from utils.logger import logger

# OWASP LLM Security Top 10 (2025) — mapping to detection
OWASP_LLM_TOP_10 = [
    {"id": "LLM01", "name": "Prompt Injection", "status": "CLEAN", "details": ""},
    {"id": "LLM02", "name": "Sensitive Information Disclosure", "status": "CLEAN", "details": ""},
    {"id": "LLM03", "name": "Supply Chain", "status": "CLEAN", "details": ""},
    {"id": "LLM04", "name": "Data and Model Poisoning", "status": "CLEAN", "details": ""},
    {"id": "LLM05", "name": "Improper Output Handling", "status": "CLEAN", "details": ""},
    {"id": "LLM06", "name": "Excessive Agency", "status": "CLEAN", "details": ""},
    {"id": "LLM07", "name": "System Prompt Leakage", "status": "CLEAN", "details": ""},
    {"id": "LLM08", "name": "Insecure Plugin Design", "status": "CLEAN", "details": ""},
    {"id": "LLM09", "name": "Misinformation", "status": "CLEAN", "details": ""},
    {"id": "LLM10", "name": "Model Theft", "status": "CLEAN", "details": ""},
]


def _get_bedrock_client():
    """Lazy Bedrock client (control plane, not runtime)."""
    import boto3
    settings = get_settings()
    profile = settings.aws_profile if (settings.aws_profile and settings.aws_profile != "default") else None
    session = boto3.Session(profile_name=profile)
    return session.client("bedrock", region_name=settings.aws_region)


def _get_bedrock_agent_client():
    """Lazy Bedrock Agent client."""
    import boto3
    settings = get_settings()
    profile = settings.aws_profile if (settings.aws_profile and settings.aws_profile != "default") else None
    session = boto3.Session(profile_name=profile)
    return session.client("bedrock-agent", region_name=settings.aws_region)


async def list_bedrock_models() -> Dict[str, Any]:
    """List Bedrock foundation models. Returns inventory for AI-BOM."""
    try:
        client = _get_bedrock_client()
        # list_foundation_models does NOT support pagination — single call returns all
        response = await asyncio.to_thread(client.list_foundation_models)
        models = []
        for m in response.get("modelSummaries", [])[:50]:
            models.append({
                "modelId": m.get("modelId"),
                "modelName": m.get("modelName"),
                "provider": m.get("providerName"),
                "modelArn": m.get("modelArn"),
                "lifecycle": m.get("modelLifecycle", {}).get("status", "ACTIVE"),
            })
        return {"models": models, "count": len(models), "source": "bedrock"}
    except Exception as e:
        logger.warning(f"list_bedrock_models failed: {e}")
        return {"models": [], "count": 0, "error": str(e), "source": "bedrock"}


async def list_bedrock_agents() -> Dict[str, Any]:
    """List Bedrock agents for agentic AI threat assessment."""
    try:
        client = _get_bedrock_agent_client()
        agents = []
        paginator = client.get_paginator("list_agents")
        for page in paginator.paginate():
            for a in page.get("agentSummaries", []):
                agents.append({
                    "agentId": a.get("agentId"),
                    "agentName": a.get("agentName"),
                    "agentStatus": a.get("agentStatus"),
                    "description": a.get("description", "")[:100],
                })
        return {"agents": agents, "count": len(agents), "source": "bedrock-agent"}
    except Exception as e:
        logger.warning(f"list_bedrock_agents failed: {e}")
        return {"agents": [], "count": 0, "error": str(e), "source": "bedrock-agent"}


async def get_guardrail_recommendations() -> Dict[str, Any]:
    """Recommend guardrail configuration based on model usage. Returns actionable suggestions."""
    from services.guardrails_service import list_guardrails
    try:
        guardrails = list_guardrails()
        items = guardrails.get("guardrails", [])
        has_prompt_attack = any(
            "prompt" in str(g).lower() or "injection" in str(g).lower()
            for g in items
        )
        return {
            "guardrails_configured": len(items),
            "recommendations": [
                {
                    "id": "GUARDRAIL_PROMPT_INJECTION",
                    "title": "Guardrail should protect against Prompt Injections",
                    "priority": "CRITICAL",
                    "status": "PASS" if has_prompt_attack or len(items) > 0 else "FAIL",
                    "detail": "Enable Bedrock Guardrails with prompt-attack filtering for all model invocations.",
                },
                {
                    "id": "GUARDRAIL_PII",
                    "title": "PII redaction for sensitive data",
                    "priority": "HIGH",
                    "status": "PASS" if len(items) > 0 else "REVIEW",
                    "detail": "Configure PII redaction in Guardrails when processing customer data.",
                },
            ],
            "source": "ai-security-service",
        }
    except Exception as e:
        logger.warning(f"get_guardrail_recommendations failed: {e}")
        return {"recommendations": [], "error": str(e)}


def generate_owasp_llm_report(
    injection_result: Optional[Dict] = None,
    output_validation: Optional[Dict] = None,
    guardrail_active: bool = False,
) -> Dict[str, Any]:
    """Generate OWASP LLM Top 10 compliance report. Maps to existing checks."""
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    report = []
    for item in OWASP_LLM_TOP_10:
        r = dict(item)
        r["last_checked"] = now
        report.append(r)

    # Map existing checks to OWASP
    if injection_result:
        r = next((x for x in report if x["id"] == "LLM01"), None)
        if r:
            r["status"] = "WARNING" if injection_result.get("detected") else "CLEAN"
            r["details"] = injection_result.get("details", "")

    if output_validation:
        r = next((x for x in report if x["id"] == "LLM02"), None)
        if r:
            r["status"] = "WARNING" if not output_validation.get("valid") else "CLEAN"
            r["details"] = "; ".join(output_validation.get("issues", [])) or "Output validation active"
        r5 = next((x for x in report if x["id"] == "LLM05"), None)
        if r5:
            r5["status"] = r["status"] if r else "CLEAN"
            r5["details"] = r["details"] if r else "Output validation active"

    # LLM06 Excessive Agency — Bedrock agents
    r6 = next((x for x in report if x["id"] == "LLM06"), None)
    if r6:
        r6["details"] = "Audit Bedrock Agent IAM roles and tool permissions"

    # LLM07 System Prompt Leakage
    r7 = next((x for x in report if x["id"] == "LLM07"), None)
    if r7:
        r7["details"] = "Output scan for system prompt patterns; Guardrails help"

    # Guardrail coverage
    if guardrail_active:
        for r in report:
            if r["id"] in ("LLM01", "LLM02", "LLM07") and r["status"] == "CLEAN":
                r["details"] = (r.get("details") or "") + " [Guardrails active]"

    passed = sum(1 for x in report if x["status"] == "CLEAN")
    return {
        "categories": report,
        "passed": passed,
        "total": len(report),
        "posture_percent": round(100 * passed / len(report)) if report else 0,
    }


async def detect_shadow_ai(days_back: int = 7, max_results: int = 100) -> Dict[str, Any]:
    """
    Detect Shadow AI: InvokeModel calls from unexpected principals.
    Scans CloudTrail for bedrock InvokeModel/InvokeModelWithResponseStream and flags
    principals not in the allowlist (SHADOW_AI_ALLOWED_PRINCIPALS env, comma-separated ARNs).
    """
    try:
        import boto3
        settings = get_settings()
        profile = settings.aws_profile if (settings.aws_profile and settings.aws_profile != "default") else None
        session = boto3.Session(profile_name=profile)
        client = session.client("cloudtrail", region_name=settings.aws_region)

        allowed_raw = getattr(settings, "shadow_ai_allowed_principals", None) or ""
        allowed = [p.strip().lower() for p in allowed_raw.split(",") if p.strip()]

        start_time = datetime.utcnow() - timedelta(days=days_back)
        end_time = datetime.utcnow()
        events = []
        next_token = None

        while len(events) < max_results:
            params = {
                "StartTime": start_time,
                "EndTime": end_time,
                "MaxResults": min(50, max_results - len(events)),
                "LookupAttributes": [{"AttributeKey": "EventName", "AttributeValue": "InvokeModel"}],
            }
            if next_token:
                params["NextToken"] = next_token
            resp = await asyncio.to_thread(client.lookup_events, **params)
            events.extend(resp.get("Events", []))
            next_token = resp.get("NextToken")
            if not next_token:
                break

        # Also InvokeModelWithResponseStream
        next_token = None
        stream_events = []
        while len(stream_events) < max_results // 2:
            params = {
                "StartTime": start_time,
                "EndTime": end_time,
                "MaxResults": 50,
                "LookupAttributes": [{"AttributeKey": "EventName", "AttributeValue": "InvokeModelWithResponseStream"}],
            }
            if next_token:
                params["NextToken"] = next_token
            resp = await asyncio.to_thread(client.lookup_events, **params)
            stream_events.extend(resp.get("Events", []))
            next_token = resp.get("NextToken")
            if not next_token:
                break

        events = (events + stream_events)[:max_results]

        findings = []
        for ev in events:
            try:
                ct_json = ev.get("CloudTrailEvent", "{}")
                if isinstance(ct_json, str):
                    ct = json.loads(ct_json)
                else:
                    ct = ct_json
            except Exception:
                continue
            uid = ct.get("userIdentity", {})
            arn = uid.get("arn") or uid.get("principalId") or ""
            if isinstance(arn, str):
                arn_lower = arn.lower()
            else:
                arn_lower = str(arn).lower()
            is_allowed = any(a in arn_lower or arn_lower in a for a in allowed) if allowed else False
            findings.append({
                "event_time": ct.get("eventTime"),
                "event_name": ct.get("eventName"),
                "principal": arn,
                "source_ip": ct.get("sourceIPAddress"),
                "suspicious": not is_allowed if allowed else False,
                "reason": "Principal not in allowlist" if (allowed and not is_allowed) else None,
            })

        return {
            "findings": findings,
            "total_invocations": len(findings),
            "suspicious_count": sum(1 for f in findings if f.get("suspicious")),
            "days_back": days_back,
            "allowlist_configured": bool(allowed),
            "source": "ai-security-shadow-ai",
        }
    except Exception as e:
        logger.warning(f"detect_shadow_ai failed: {e}")
        return {
            "findings": [],
            "total_invocations": 0,
            "suspicious_count": 0,
            "error": str(e),
            "source": "ai-security-shadow-ai",
        }
