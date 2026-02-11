"""
Orchestration API endpoints — delegates to Strands Agents SDK orchestrator.

All orchestration routes now use the StrandsOrchestrator, which coordinates
multi-agent analysis using real @tool-decorated Strands tools and AWS MCP servers.
"""
import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, Optional, List

from agents.strands_orchestrator import StrandsOrchestrator, STRANDS_TOOLS
from utils.logger import logger

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])

# Single orchestrator — Strands-based (replaces the old Orchestrator class)
orchestrator = StrandsOrchestrator()


@router.post("/analyze-incident")
async def analyze_incident(
    events: str = Form(...),  # JSON string of events
    diagram: Optional[UploadFile] = File(None),
    incident_type: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Orchestrate full incident analysis using Strands Agents SDK.
    
    This endpoint coordinates the Strands tool pipeline:
    - analyze_security_timeline (Nova 2 Lite) for timeline analysis
    - score_event_risk (Nova Micro) for risk assessment
    - generate_remediation (Nova 2 Lite) for plan generation
    - generate_incident_documentation (Nova 2 Lite) for docs
    
    Also integrates AWS MCP server tools for CloudTrail, IAM, and CloudWatch.
    """
    try:
        # Parse events
        try:
            events_list = json.loads(events)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="events must be valid JSON"
            )
        
        # Read diagram if provided
        diagram_data = None
        if diagram:
            if not diagram.content_type or not diagram.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail="Diagram must be an image file"
                )
            diagram_data = await diagram.read()
        
        logger.info(f"Starting Strands-orchestrated analysis ({len(events_list)} events, "
                     f"diagram: {diagram is not None})")
        
        # Run Strands-orchestrated analysis
        result = await orchestrator.plan_and_execute(
            events=events_list,
            diagram_data=diagram_data,
            incident_type=incident_type
        )
        
        # Upload diagram to S3 if provided
        if diagram and diagram_data:
            try:
                from services.s3_service import S3Service
                s3_service = S3Service()
                diagram_s3_key = await s3_service.upload_diagram(
                    incident_id=result["incident_id"],
                    diagram_data=diagram_data,
                    filename=diagram.filename,
                    content_type=diagram.content_type
                )
                if diagram_s3_key:
                    result["diagram_s3_key"] = diagram_s3_key
            except Exception as e:
                logger.warning(f"Failed to upload diagram to S3: {e}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in Strands analysis: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Orchestrated analysis failed: {str(e)}"
        )


@router.get("/incident/{incident_id}")
async def get_incident_state(incident_id: str) -> Dict[str, Any]:
    """Get current state of an incident analysis from execution history."""
    try:
        # Search execution history
        for entry in orchestrator.get_execution_history():
            if entry.get("incident_id") == incident_id:
                return entry
        
        raise HTTPException(
            status_code=404,
            detail=f"Incident {incident_id} not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting incident state: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get incident state: {str(e)}"
        )


@router.get("/incidents")
async def list_incidents() -> Dict[str, Any]:
    """List all processed incidents from execution history."""
    try:
        history = orchestrator.get_execution_history()
        
        return {
            "count": len(history),
            "incidents": history
        }
        
    except Exception as e:
        logger.error(f"Error listing incidents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list incidents: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "orchestration-api",
        "framework": "strands-agents (real SDK)",
        "tools_registered": len(STRANDS_TOOLS),
        "agents": ["temporal", "risk_scorer", "remediation", "documentation"],
        "mcp_servers": ["cloudtrail", "iam", "cloudwatch", "nova-canvas"]
    }
