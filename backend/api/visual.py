"""
Visual Analysis API endpoints
"""
import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, Dict, Any

from agents.visual_agent import VisualAgent
from utils.logger import logger

router = APIRouter(prefix="/api/visual", tags=["visual"])
visual_agent = VisualAgent()


@router.post("/analyze-diagram")
async def analyze_diagram(
    file: UploadFile = File(...),
    context: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Analyze an architecture diagram or screenshot
    
    Upload an image file (PNG, JPG) and get security analysis:
    - Security vulnerabilities
    - Configuration drift
    - Exposed resources
    - Compliance issues
    - Recommendations
    
    Args:
        file: Image file to analyze
        context: Optional context about what to look for
        
    Returns:
        Analysis results with findings and recommendations
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (PNG, JPG, etc.)"
            )
        
        # Read image data
        image_data = await file.read()
        
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="Image file too large (max 10MB)"
            )
        
        logger.info(f"Received diagram analysis request: {file.filename} ({len(image_data)} bytes)")
        
        analysis = await visual_agent.analyze_diagram(
            image_data=image_data,
            context=context,
            content_type=file.content_type,
            filename=file.filename
        )
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in diagram analysis: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Diagram analysis failed: {str(e)}"
        )


@router.post("/detect-drift")
async def detect_drift(
    file: UploadFile = File(...),
    expected_config: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Detect configuration drift in architecture diagram
    
    Compare the diagram to expected configuration and identify deviations.
    
    Args:
        file: Current architecture diagram
        expected_config: Optional JSON string of expected configuration
        
    Returns:
        Drift analysis with differences and recommendations
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (PNG, JPG, etc.)"
            )
        
        # Read image data
        image_data = await file.read()
        
        # Parse expected config if provided
        expected_config_dict = None
        if expected_config:
            import json
            try:
                expected_config_dict = json.loads(expected_config)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="expected_config must be valid JSON"
                )
        
        logger.info(f"Received drift detection request: {file.filename}")
        
        drift_analysis = await visual_agent.detect_configuration_drift(
            image_data=image_data,
            expected_config=expected_config_dict,
            content_type=file.content_type,
            filename=file.filename
        )
        
        return drift_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in drift detection: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Drift detection failed: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "visual-analysis-api",
        "model": "amazon.nova-pro-v1:0"
    }
