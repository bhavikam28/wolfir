"""
AI Security API — MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF, Bedrock Guardrails
AI Security Posture Management (AI-SPM) for AWS.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional

from services.guardrails_service import list_guardrails
from utils.config import get_settings
from services.ai_pipeline_monitor import (
    generate_atlas_report,
    monitor_invocation_patterns,
    scan_for_prompt_injection,
    validate_model_output,
    get_owasp_llm_report,
)
from services.ai_security_service import (
    list_bedrock_models,
    list_bedrock_agents,
    get_guardrail_recommendations,
    detect_shadow_ai,
)

router = APIRouter(prefix="/api/ai-security", tags=["ai-security"])


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Current ATLAS + OWASP LLM threat status."""
    report = generate_atlas_report()
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    owasp = get_owasp_llm_report(guardrail_active=guardrail_active)
    return {
        "techniques": report["techniques"],
        "summary": report.get("invocation_summary", {}),
        "is_simulated": report.get("is_simulated", False),
        "owasp_llm": owasp,
    }


@router.get("/invocations")
async def get_invocations() -> Dict[str, Any]:
    """Invocation metrics per model."""
    return monitor_invocation_patterns()


@router.get("/governance")
async def get_governance() -> Dict[str, Any]:
    """NIST AI RMF compliance status."""
    report = generate_atlas_report()
    return {"nist_rmf": report.get("nist_rmf", {})}


@router.get("/guardrails")
async def get_guardrails() -> Dict[str, Any]:
    """List guardrails in the account. Enables users to discover and configure Guardrails for wolfir."""
    return list_guardrails()


@router.get("/guardrail-config")
async def get_guardrail_config() -> Dict[str, Any]:
    """Current guardrail configuration (from env). Tells frontend if Guardrails are active."""
    s = get_settings()
    active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    return {
        "active": active,
        "guardrail_identifier": s.guardrail_identifier if active else None,
        "guardrail_version": s.guardrail_version if active else "1",
        "hint": "Set GUARDRAIL_IDENTIFIER and GUARDRAIL_VERSION in .env to enable. Restart backend after change.",
    }


@router.post("/scan")
async def trigger_scan(body: Optional[Dict[str, Any]] = Body(default={})) -> Dict[str, Any]:
    """Trigger manual security scan and refresh ATLAS + OWASP status."""
    input_text = (body or {}).get("input_text", "")
    injection = scan_for_prompt_injection(input_text)
    validation = validate_model_output(input_text) if input_text else {"valid": True, "issues": []}
    report = generate_atlas_report()
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    owasp = get_owasp_llm_report(injection, validation, guardrail_active)
    return {
        "prompt_injection": injection,
        "output_validation": validation,
        "techniques": report["techniques"],
        "summary": report.get("invocation_summary", {}),
        "owasp_llm": owasp,
    }


@router.get("/owasp-llm")
async def get_owasp_llm() -> Dict[str, Any]:
    """OWASP LLM Security Top 10 compliance posture."""
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    return get_owasp_llm_report(guardrail_active=guardrail_active)


@router.get("/bedrock-inventory")
async def bedrock_inventory() -> Dict[str, Any]:
    """List Bedrock foundation models (AI-BOM)."""
    return await list_bedrock_models()


@router.get("/bedrock-agents")
async def bedrock_agents() -> Dict[str, Any]:
    """List Bedrock agents for agentic AI threat assessment."""
    return await list_bedrock_agents()


@router.get("/guardrail-recommendations")
async def guardrail_recommendations() -> Dict[str, Any]:
    """Guardrail configuration recommendations."""
    return await get_guardrail_recommendations()


@router.get("/shadow-ai")
async def shadow_ai(days_back: int = 7, max_results: int = 100) -> Dict[str, Any]:
    """Detect Shadow AI: InvokeModel calls from unexpected principals."""
    return await detect_shadow_ai(days_back=days_back, max_results=max_results)


@router.get("/ai-bom")
async def ai_bom() -> Dict[str, Any]:
    """AI Bill of Materials — models, agents, dependencies. Export for compliance."""
    models = await list_bedrock_models()
    agents = await list_bedrock_agents()
    report = generate_atlas_report()
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    owasp = get_owasp_llm_report(guardrail_active=guardrail_active)
    model_list = models.get("models", models.get("items", []))
    agent_list = agents.get("agents", agents.get("items", []))
    return {
        "bom_version": "1.0",
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "models": model_list,
        "model_count": models.get("count", len(model_list)),
        "agents": agent_list,
        "agent_count": agents.get("count", len(agent_list)),
        "guardrails": {"active": guardrail_active, "identifier": s.guardrail_identifier if guardrail_active else None},
        "owasp_llm": owasp,
        "mitre_atlas_techniques": report.get("techniques", []),
    }
