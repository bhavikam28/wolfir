"""
AI Pipeline Security API — MITRE ATLAS, NIST AI RMF, Bedrock Guardrails
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
)

router = APIRouter(prefix="/api/ai-security", tags=["ai-security"])


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Current ATLAS threat status (all 6 techniques)."""
    report = generate_atlas_report()
    return {
        "techniques": report["techniques"],
        "summary": report.get("invocation_summary", {}),
        "is_simulated": report.get("is_simulated", False),
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
    """List guardrails in the account. Enables users to discover and configure Guardrails for Nova Sentinel."""
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
    """Trigger manual security scan and refresh ATLAS status."""
    input_text = (body or {}).get("input_text", "")
    injection = scan_for_prompt_injection(input_text)
    validation = validate_model_output(input_text) if input_text else {"valid": True, "issues": []}
    report = generate_atlas_report()
    return {
        "prompt_injection": injection,
        "output_validation": validation,
        "techniques": report["techniques"],
        "summary": report.get("invocation_summary", {}),
    }
