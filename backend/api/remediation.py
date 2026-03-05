"""
Remediation API endpoints — plan generation, execution, approval
"""
import asyncio
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from dataclasses import asdict

from agents.remediation_agent import RemediationAgent
from services.remediation_executor import RemediationExecutor, ExecutionResult
from services.approval_manager import (
    create_pending_approval,
    get_pending,
    approve_and_get,
    list_pending,
    store_execution_proof,
    get_execution_proofs,
)
from utils.logger import logger

router = APIRouter(prefix="/api/remediation", tags=["remediation"])
remediation_agent = RemediationAgent()


@router.post("/generate-plan")
async def generate_plan(
    incident_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate a remediation plan for a security incident
    
    Args:
        incident_analysis: Full incident analysis with timeline, root cause, etc.
        
    Returns:
        Remediation plan with steps and validation
    """
    try:
        logger.info("Received remediation plan generation request")
        
        # Extract required fields
        timeline = incident_analysis.get("timeline", {})
        root_cause = timeline.get("root_cause", "Unknown")
        attack_pattern = timeline.get("attack_pattern", "Unknown")
        blast_radius = timeline.get("blast_radius", "Unknown")
        events = timeline.get("events", [])
        
        # Generate plan
        plan = await remediation_agent.generate_remediation_plan(
            incident_analysis=incident_analysis,
            root_cause=root_cause,
            attack_pattern=attack_pattern,
            blast_radius=blast_radius,
            timeline_events=events
        )
        
        return plan
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error generating remediation plan: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Remediation plan generation failed: {str(e)}"
        )


@router.post("/validate-plan")
async def validate_plan(
    plan: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validate a remediation plan for safety and compliance
    
    Args:
        plan: Remediation plan to validate
        
    Returns:
        Validation results
    """
    try:
        logger.info(f"Validating remediation plan: {plan.get('plan_id', 'Unknown')}")
        
        validation = await remediation_agent.validate_plan(plan)
        
        return validation
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error validating plan: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Plan validation failed: {str(e)}"
        )


@router.post("/execute/{step_id}")
async def execute_step(
    step_id: str,
    incident_id: str = Query(...),
    action: str = Query(...),
    target: str = Query(...),
    demo_mode: bool = Query(False),
) -> Dict[str, Any]:
    """Execute a specific remediation step (AUTO or approved)."""
    try:
        exec = RemediationExecutor(demo_mode=demo_mode)
        action_lower = (action or "").lower()
        result: Optional[ExecutionResult] = None
        if "tag" in action_lower or "quarantine" in action_lower:
            result = await exec.execute_quarantine_tag(f"arn:aws:iam::123456789012:role/{target}", incident_id)
        elif "deny" in action_lower or "policy" in action_lower:
            result = await exec.execute_deny_policy(target, ["iam:*"], incident_id)
        elif "disable" in action_lower and "key" in action_lower:
            result = await exec.execute_disable_access_key("AKIAEXAMPLE", target, incident_id)
        else:
            result = await exec.execute_deny_policy(target, ["*"], incident_id)
        proof = asdict(result)
        store_execution_proof(incident_id, proof)
        return {"status": "success", "execution_proof": proof}
    except Exception as e:
        logger.error(f"Execute step failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve/{approval_token}")
async def approve_remediation(approval_token: str) -> Dict[str, Any]:
    """Approve a pending remediation and execute."""
    p = approve_and_get(approval_token)
    if not p:
        raise HTTPException(status_code=404, detail="Approval not found or already processed")
    # Use demo_mode from approval if stored; default False for real execution
    demo_mode = p.get("demo_mode", False)
    exec = RemediationExecutor(demo_mode=demo_mode)
    result = await exec.execute_disable_access_key(
        p["params"].get("access_key_id", "AKIAEXAMPLE"),
        p.get("target", "unknown"),
        p.get("incident_id", "INC-DEMO"),
    )
    store_execution_proof(p["incident_id"], asdict(result))
    return {"status": "approved", "execution_proof": asdict(result)}


@router.get("/execution-proof/{incident_id}")
async def get_execution_proof(incident_id: str) -> Dict[str, Any]:
    """Get all execution proofs for an incident."""
    proofs = get_execution_proofs(incident_id)
    return {"incident_id": incident_id, "proofs": proofs, "count": len(proofs)}


@router.get("/pending-approvals")
async def get_pending_approvals(incident_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    """List all pending human approvals."""
    items = list_pending(incident_id)
    return {"pending": items, "count": len(items)}


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "remediation-api",
        "model": "amazon.nova-lite-v1:0",
    }
