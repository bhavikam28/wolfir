"""
Voice API endpoints - Nova Sonic powered voice interaction
"""
from fastapi import APIRouter, HTTPException, Form
from typing import Dict, Any, Optional
from pydantic import BaseModel

from agents.voice_agent import VoiceAgent
from utils.logger import logger

router = APIRouter(prefix="/api/voice", tags=["voice"])
voice_agent = VoiceAgent()


class VoiceQueryRequest(BaseModel):
    """Request model for voice queries"""
    query: str
    incident_context: Optional[Dict[str, Any]] = None


class VoiceSummaryRequest(BaseModel):
    """Request model for voice summary generation"""
    incident_data: Dict[str, Any]


@router.post("/query")
async def voice_query(request: VoiceQueryRequest) -> Dict[str, Any]:
    """
    Process a voice query about security incidents.
    
    Uses Nova Sonic to understand natural language security questions
    and provide contextual responses based on current incident data.
    
    Args:
        request: Query text and optional incident context
        
    Returns:
        AI response with text, action suggestions, and follow-ups
    """
    try:
        logger.info(f"Voice query received: {request.query[:100]}...")
        
        result = await voice_agent.process_voice_query(
            query_text=request.query,
            incident_context=request.incident_context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Voice query error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Voice query failed: {str(e)}"
        )


@router.post("/summary")
async def voice_summary(request: VoiceSummaryRequest) -> Dict[str, Any]:
    """
    Generate a spoken summary of incident analysis results.
    
    Returns text optimized for text-to-speech output.
    
    Args:
        request: Complete incident analysis data
        
    Returns:
        Summary text for speech output
    """
    try:
        logger.info("Generating voice summary...")
        
        result = await voice_agent.generate_voice_summary(
            incident_data=request.incident_data
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Voice summary error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Voice summary generation failed: {str(e)}"
        )


@router.post("/process-command")
async def process_command(
    command: str = Form(...)
) -> Dict[str, Any]:
    """
    Process a voice command and determine action.
    
    Args:
        command: Transcribed voice command text
        
    Returns:
        Command interpretation with action and parameters
    """
    try:
        logger.info(f"Processing voice command: {command}")
        result = await voice_agent.process_voice_command(command)
        return result
    except Exception as e:
        logger.error(f"Voice command error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Command processing failed: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "voice-api",
        "model": "amazon.nova-sonic-v1:0",
        "capabilities": "query,summary,command"
    }
