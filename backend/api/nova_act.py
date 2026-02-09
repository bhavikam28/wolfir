"""
Nova Act API endpoints - Browser automation for security remediation
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from agents.nova_act_agent import NovaActAgent
from utils.logger import logger

router = APIRouter(prefix="/api/nova-act", tags=["nova-act"])
nova_act = NovaActAgent()


class RemediationAutomationRequest(BaseModel):
    """Request for remediation automation plan"""
    incident_type: str
    root_cause: str
    affected_resources: List[str] = []
    remediation_steps: List[Dict[str, Any]] = []


class JiraAutomationRequest(BaseModel):
    """Request for JIRA automation"""
    incident_id: str
    summary: str
    description: str = ""
    severity: str = "high"


@router.post("/remediation-automation")
async def generate_remediation_automation(request: RemediationAutomationRequest) -> Dict[str, Any]:
    """
    Generate browser automation plan for incident remediation.
    
    Uses Nova Act to create step-by-step AWS Console navigation and
    remediation actions, plus AWS CLI alternatives.
    """
    try:
        logger.info(f"Generating remediation automation for: {request.incident_type}")
        result = await nova_act.generate_remediation_automation(
            incident_type=request.incident_type,
            root_cause=request.root_cause,
            affected_resources=request.affected_resources,
            remediation_steps=request.remediation_steps
        )
        return result
    except Exception as e:
        logger.error(f"Remediation automation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jira-automation")
async def generate_jira_automation(request: JiraAutomationRequest) -> Dict[str, Any]:
    """
    Generate JIRA ticket creation automation plan.
    
    Uses Nova Act to create browser automation steps for JIRA ticket creation.
    """
    try:
        logger.info(f"Generating JIRA automation for: {request.incident_id}")
        result = await nova_act.generate_jira_automation(
            incident_id=request.incident_id,
            summary=request.summary,
            description=request.description,
            severity=request.severity
        )
        return result
    except Exception as e:
        logger.error(f"JIRA automation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check for Nova Act service"""
    return {
        "status": "healthy",
        "service": "nova-act",
        "capabilities": [
            "remediation-automation",
            "jira-automation",
            "browser-automation-plans"
        ],
        "model": "amazon.nova-act"
    }
