"""
Orchestration API endpoints — delegates to Strands Agents SDK orchestrator.

All orchestration routes now use the StrandsOrchestrator, which coordinates
multi-agent analysis using real @tool-decorated Strands tools and AWS MCP servers.
"""
import json
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from agents.strands_orchestrator import StrandsOrchestrator, STRANDS_TOOLS


class AgentQueryRequest(BaseModel):
    """Request for agentic query — Agent plans its own tool sequence."""
    prompt: str
from services.cloudtrail_service import CloudTrailService
from utils.logger import logger

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])

# Single orchestrator — Strands-based (replaces the old Orchestrator class)
orchestrator = StrandsOrchestrator()


@router.post("/analyze-incident")
async def analyze_incident(
    events: str = Form(...),  # JSON string of events
    diagram: Optional[UploadFile] = File(None),
    incident_type: Optional[str] = Form(None),
    account_id: Optional[str] = Form(default="demo-account"),
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
            incident_type=incident_type,
            account_id=account_id or "demo-account",
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
        logger.error(f"Error in Strands analysis: {e}\n{traceback.format_exc()}")
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


@router.post("/analyze-from-cloudtrail")
async def analyze_from_cloudtrail(
    days_back: int = Query(7, ge=1, le=90),
    max_events: int = Query(100, ge=10, le=500),
    profile: Optional[str] = Query(None),
    account_id: Optional[str] = Query(default="demo-account"),
) -> Dict[str, Any]:
    """
    Single-call AWS mode: fetch CloudTrail events server-side and run full orchestration.
    Replaces the two-step flow (fetch + orchestrate) with one request.
    """
    try:
        cloudtrail_service = CloudTrailService(profile=profile)
        try:
            cloudtrail_events = await cloudtrail_service.get_security_events(
                days_back=days_back,
                max_results=max_events,
            )
        except PermissionError as e:
            raise HTTPException(status_code=403, detail=str(e)) from e

        if not cloudtrail_events:
            return {
                "incident_id": f"INC-{uuid.uuid4().hex[:6].upper()}",
                "status": "no_events",
                "message": f"No security-relevant CloudTrail events found in the last {days_back} days.",
                "results": {},
                "metadata": {"incident_type": "No events"},
            }

        # Format events for orchestrator (extract from CloudTrailEvent if needed)
        formatted_events = []
        for event in cloudtrail_events:
            if "CloudTrailEvent" in event:
                try:
                    formatted_events.append(json.loads(event["CloudTrailEvent"]))
                except (json.JSONDecodeError, TypeError):
                    formatted_events.append(event)
            else:
                formatted_events.append(event)

        incident_label = f"Real AWS (last {days_back} days, {len(formatted_events)} events)"
        result = await orchestrator.plan_and_execute(
            events=formatted_events,
            diagram_data=None,
            incident_type=incident_label,
            account_id=account_id or "demo-account",
        )
        result["status"] = "analyzed"
        result["events_analyzed"] = len(formatted_events)
        result["time_range_days"] = days_back
        return result

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Analyze-from-cloudtrail failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent-query")
async def agent_query(request: AgentQueryRequest) -> Dict[str, Any]:
    """
    Agentic query — the Strands Agent autonomously plans and executes tools.
    
    Unlike the deterministic pipeline (analyze-incident), this lets the Agent
    decide which tools to call based on the prompt. Demonstrates real agentic
    reasoning: "Investigate this IAM role for privilege escalation",
    "Scan CloudTrail for anomalies in the last 7 days", etc.
    
    The Agent can call: CloudTrail lookup, IAM audit, CloudWatch checks,
    incident history, timeline analysis, remediation, and more.
    """
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt must be a non-empty string")
    
    try:
        logger.info(f"Agentic query: {prompt[:80]}...")
        response = await orchestrator.agent_query(prompt)
        return {
            "response": response,
            "framework": "strands-agents",
            "mode": "autonomous",
            "message": "Agent autonomously planned and executed tools based on your prompt.",
        }
    except Exception as e:
        logger.error(f"Agentic query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent query failed: {str(e)}")


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "orchestration-api",
        "framework": "strands-agents (real SDK)",
        "tools_registered": len(STRANDS_TOOLS),
        "agents": ["temporal", "risk_scorer", "remediation", "documentation"],
        "mcp_servers": ["cloudtrail", "iam", "cloudwatch", "nova-canvas"],
        "agentic_query": "POST /api/orchestration/agent-query",
    }
