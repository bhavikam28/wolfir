"""
Analysis API endpoints
"""
import time
import uuid
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional

from models.incident import AnalysisRequest, AnalysisResponse
from agents.temporal_agent import TemporalAgent
from agents.risk_scorer_agent import RiskScorerAgent
from services.cloudtrail_service import CloudTrailService
from utils.logger import logger
from utils.config import get_settings

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
temporal_agent = TemporalAgent()
risk_scorer = RiskScorerAgent()
cloudtrail_service = CloudTrailService()
settings = get_settings()


@router.post("/timeline", response_model=AnalysisResponse)
async def analyze_timeline(request: AnalysisRequest):
    """
    Analyze CloudTrail events and generate incident timeline
    
    Args:
        request: Analysis request with CloudTrail events
        
    Returns:
        Timeline analysis with root cause and insights
    """
    try:
        start_time = time.time()
        
        logger.info(f"Received timeline analysis request with {len(request.events)} events")
        
        # Perform temporal analysis
        timeline = await temporal_agent.analyze_timeline(
            events=request.events,
            incident_type=request.incident_type or "Unknown"
        )
        
        analysis_time = int((time.time() - start_time) * 1000)
        
        # Generate incident ID
        incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        
        response = AnalysisResponse(
            incident_id=incident_id,
            timeline=timeline,
            analysis_time_ms=analysis_time,
            model_used=settings.nova_lite_model_id
        )
        
        logger.info(f"Timeline analysis complete: {incident_id} in {analysis_time}ms")
        
        return response
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in timeline analysis endpoint: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Timeline analysis failed: {str(e)}\n\nTraceback:\n{error_trace}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "analysis-api",
        "model": settings.nova_lite_model_id
    }


@router.post("/real-cloudtrail")
async def analyze_real_cloudtrail(
    days_back: int = Query(7, ge=1, le=90),
    max_events: int = Query(100, ge=10, le=500),
    profile: Optional[str] = Query(None, description="AWS profile name (optional)"),
    fetch_only: bool = Query(False, description="If true, only fetch events (no analysis). Use for orchestration pipeline.")
):
    """
    Fetch and optionally analyze real CloudTrail events from your AWS account.
    
    When fetch_only=true: Returns raw events only (no Nova analysis). Frontend passes these
    to /api/orchestration/analyze-incident for single-pass full pipeline.
    
    When fetch_only=false: Fetches + runs temporal analysis (legacy, causes double analysis
    if frontend also calls orchestration).
    """
    try:
        start_time = time.time()
        
        profile_to_use = profile or settings.aws_profile
        logger.info(f"Starting real CloudTrail analysis (last {days_back} days, max {max_events} events, profile: {profile_to_use})")

        from services.cloudtrail_service import CloudTrailService
        cloudtrail_service_instance = CloudTrailService(profile=profile_to_use)
        
        try:
            cloudtrail_events = await cloudtrail_service_instance.get_security_events(
                days_back=days_back,
                max_results=max_events
            )
        except PermissionError as e:
            raise HTTPException(
                status_code=403,
                detail=str(e)
            ) from e
        
        if not cloudtrail_events:
            return {
                "incident_id": f"INC-{uuid.uuid4().hex[:6].upper()}",
                "status": "no_events",
                "message": f"No security-relevant CloudTrail events found in the last {days_back} days. Ensure CloudTrail is enabled and IAM has cloudtrail:LookupEvents. See docs/IAM-POLICY-CLOUDTRAIL.md",
                "analysis_time_ms": int((time.time() - start_time) * 1000),
                "events_searched": 0
            }
        
        # Convert CloudTrail events to the format expected by temporal agent
        # CloudTrail events have CloudTrailEvent structure, but we need to extract the actual event
        formatted_events = []
        for event in cloudtrail_events:
            # CloudTrail lookup_events returns events with CloudTrailEvent structure
            # Extract the actual event JSON from the CloudTrailEvent
            if 'CloudTrailEvent' in event:
                import json
                try:
                    event_json = json.loads(event['CloudTrailEvent'])
                    formatted_events.append(event_json)
                except (json.JSONDecodeError, TypeError):
                    # If parsing fails, use the event as-is
                    formatted_events.append(event)
            else:
                formatted_events.append(event)
        
        logger.info(f"Fetched {len(formatted_events)} CloudTrail events")
        
        if fetch_only:
            analysis_time = int((time.time() - start_time) * 1000)
            return {
                "incident_id": f"INC-{uuid.uuid4().hex[:6].upper()}",
                "status": "fetched",
                "raw_events": formatted_events,
                "analysis_time_ms": analysis_time,
                "events_analyzed": len(formatted_events),
                "time_range_days": days_back,
                "data_source": "real_cloudtrail",
            }
        
        timeline = await temporal_agent.analyze_timeline(
            events=formatted_events,
            incident_type="Real CloudTrail Analysis"
        )
        
        analysis_time = int((time.time() - start_time) * 1000)
        incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        
        response = AnalysisResponse(
            incident_id=incident_id,
            timeline=timeline,
            analysis_time_ms=analysis_time,
            model_used=settings.nova_lite_model_id
        )
        
        logger.info(f"Real CloudTrail analysis complete: {incident_id} in {analysis_time}ms")
        
        response_dict = response.dict()
        response_dict['data_source'] = 'real_cloudtrail'
        response_dict['events_analyzed'] = len(formatted_events)
        response_dict['time_range_days'] = days_back
        response_dict['raw_events'] = formatted_events
        
        return response_dict
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in real CloudTrail analysis: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Real CloudTrail analysis failed: {str(e)}\n\nTraceback:\n{error_trace}"
        )


@router.post("/risk-score")
async def score_risk(
    configuration: Dict[str, Any],
    context: Optional[str] = None
):
    """
    Quickly classify risk level for a security configuration using Nova Micro
    
    This endpoint uses Nova Micro for fast (<1 second) risk classification.
    Perfect for real-time risk assessment of IAM policies, security groups, etc.
    
    Args:
        configuration: Security configuration to analyze (JSON in request body)
        context: Optional context about the configuration (query parameter)
        
    Returns:
        Risk assessment with level, confidence, rationale, and recommendations
    """
    try:
        start_time = time.time()
        
        logger.info("Received risk scoring request")
        
        # Score the risk using Nova Micro
        risk_assessment = await risk_scorer.score_risk(
            configuration=configuration,
            context=context
        )
        
        analysis_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Risk scoring complete in {analysis_time}ms: {risk_assessment.get('risk_level', 'UNKNOWN')}")
        
        return {
            **risk_assessment,
            "analysis_time_ms": analysis_time,
            "model_used": settings.nova_micro_model_id
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in risk scoring: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk scoring failed: {str(e)}\n\nTraceback:\n{error_trace}"
        )


@router.post("/risk-score-event")
async def score_event_risk(
    event: Dict[str, Any],
    event_type: Optional[str] = None
):
    """
    Quickly score risk for a single CloudTrail event using Nova Micro
    
    Args:
        event: CloudTrail event to score (JSON in request body)
        event_type: Optional event type classification (query parameter)
        
    Returns:
        Risk assessment for the event
    """
    try:
        start_time = time.time()
        
        logger.info("Received event risk scoring request")
        
        # Score the event risk
        risk_assessment = await risk_scorer.score_event_risk(
            event=event,
            event_type=event_type
        )
        
        analysis_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Event risk scoring complete in {analysis_time}ms")
        
        return {
            **risk_assessment,
            "analysis_time_ms": analysis_time,
            "model_used": settings.nova_micro_model_id
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in event risk scoring: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Event risk scoring failed: {str(e)}\n\nTraceback:\n{error_trace}"
        )


@router.get("/test-bedrock")
async def test_bedrock():
    """Test Bedrock connectivity"""
    try:
        logger.info("Testing Bedrock connectivity...")
        test_response = await temporal_agent.bedrock.invoke_nova_lite(
            prompt="Say 'Hello' in one word.",
            max_tokens=10,
            temperature=0.0
        )
        return {
            "status": "success",
            "response": test_response.get("text", "No text in response"),
            "model": settings.nova_lite_model_id
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Bedrock test failed: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Bedrock test failed: {str(e)}\n\nTraceback:\n{error_trace}"
        )
