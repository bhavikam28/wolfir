"""
Voice API endpoints — Aria voice assistant

Dual-model voice architecture:
- /api/voice/query — Text input, uses Nova 2 Lite for NLU (browser STT/TTS)
- /api/voice/audio — Audio input; Nova 2 Sonic integration-ready (WebSocket); fallback to text
- /api/voice/summary — Text summary generation, uses Nova 2 Lite
- /api/voice/process-command — Intent detection, uses Nova 2 Lite
"""
import base64
from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from typing import Dict, Any, Optional
from pydantic import BaseModel

from agents.voice_agent import VoiceAgent
from utils.config import get_settings
from utils.logger import logger

router = APIRouter(prefix="/api/voice", tags=["voice"])
voice_agent = VoiceAgent()
settings = get_settings()


class VoiceQueryRequest(BaseModel):
    """Request model for text-based voice queries (Path A: Nova 2 Lite)"""
    query: str
    incident_context: Optional[Dict[str, Any]] = None
    account_id: str = "demo-account"


class AudioQueryRequest(BaseModel):
    """Request model for audio-based voice queries (Path B: Nova 2 Sonic)"""
    audio_b64: str  # Base64-encoded audio data
    audio_format: str = "wav"  # Audio format (wav, pcm, webm)
    incident_context: Optional[Dict[str, Any]] = None
    account_id: str = "demo-account"


class VoiceSummaryRequest(BaseModel):
    """Request model for voice summary generation"""
    incident_data: Dict[str, Any]


@router.post("/query")
async def voice_query(request: VoiceQueryRequest) -> Dict[str, Any]:
    """
    Process a text-based voice query about security incidents.
    
    Pipeline: Browser STT -> text -> Nova 2 Lite (NLU) -> text -> Browser TTS
    
    Uses Nova 2 Lite because Nova Sonic only accepts SPEECH input (not text).
    The browser's Web Speech API handles STT and TTS.
    """
    try:
        logger.info(f"Text voice query received: {request.query[:100]}...")
        
        result = await voice_agent.process_voice_query(
            query_text=request.query,
            incident_context=request.incident_context,
            account_id=request.account_id or "demo-account",
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Voice query error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Voice query failed: {str(e)}"
        )


@router.post("/audio")
async def audio_query(request: AudioQueryRequest) -> Dict[str, Any]:
    """
    Process raw audio input using Nova 2 Sonic (speech-to-speech).
    
    Pipeline: Browser MediaRecorder -> audio -> Nova 2 Sonic -> audio + text
    
    Nova 2 Sonic (amazon.nova-2-sonic-v1:0) is a speech foundation model.
    Input: SPEECH only | Output: SPEECH + TEXT
    
    Falls back gracefully if Nova Sonic encounters issues.
    """
    try:
        logger.info(f"Audio query received: format={request.audio_format}, "
                     f"b64_length={len(request.audio_b64)}")
        
        # Decode base64 audio
        try:
            audio_bytes = base64.b64decode(request.audio_b64)
        except Exception as decode_err:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid base64 audio data: {str(decode_err)}"
            )
        
        if len(audio_bytes) < 100:
            raise HTTPException(
                status_code=400,
                detail="Audio data too short. Please record at least 1 second of audio."
            )
        
        result = await voice_agent.process_audio_query(
            audio_bytes=audio_bytes,
            audio_format=request.audio_format,
            incident_context=request.incident_context,
            account_id=request.account_id or "demo-account",
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio query error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Audio processing failed: {str(e)}"
        )


@router.post("/audio-upload")
async def audio_upload_query(
    audio: UploadFile = File(...),
    incident_context: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Process uploaded audio file using Nova 2 Sonic.
    
    Alternative to /audio endpoint — accepts multipart file upload
    instead of base64-encoded JSON body.
    """
    try:
        audio_bytes = await audio.read()
        
        # Determine format from content type or filename
        audio_format = "wav"
        if audio.content_type:
            if "webm" in audio.content_type:
                audio_format = "webm"
            elif "ogg" in audio.content_type:
                audio_format = "ogg"
            elif "mp3" in audio.content_type or "mpeg" in audio.content_type:
                audio_format = "mp3"
        
        context = None
        if incident_context:
            import json
            try:
                context = json.loads(incident_context)
            except json.JSONDecodeError:
                pass
        
        result = await voice_agent.process_audio_query(
            audio_bytes=audio_bytes,
            audio_format=audio_format,
            incident_context=context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Audio upload query error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Audio processing failed: {str(e)}"
        )


@router.post("/summary")
async def voice_summary(request: VoiceSummaryRequest) -> Dict[str, Any]:
    """
    Generate a spoken summary of incident analysis results.
    Uses Nova 2 Lite for text generation (browser TTS handles speech).
    """
    try:
        logger.info("Generating voice summary via Nova 2 Lite...")
        
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
    Uses Nova 2 Lite for intent classification.
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
async def health_check() -> Dict[str, Any]:
    """Health check — reports actual models used by each voice pipeline."""
    return {
        "status": "healthy",
        "service": "voice-api (Aria)",
        "pipelines": {
            "text_query": {
                "endpoint": "/api/voice/query",
                "model": settings.nova_lite_model_id,
                "description": "Text input -> Nova 2 Lite NLU -> text response"
            },
            "audio_query": {
                "endpoint": "/api/voice/audio",
                "model": settings.nova_sonic_model_id,
                "description": "Audio input -> Nova 2 Sonic speech-to-speech -> audio + text"
            },
            "summary": {
                "endpoint": "/api/voice/summary",
                "model": settings.nova_lite_model_id,
                "description": "Incident data -> Nova 2 Lite -> spoken briefing text"
            },
        },
        "capabilities": "text-query,audio-query,audio-upload,summary,command"
    }
