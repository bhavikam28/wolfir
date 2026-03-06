"""
Storage API endpoints - DynamoDB and S3 operations
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import Dict, Any, Optional, List

from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service
from utils.logger import logger

router = APIRouter(prefix="/api/storage", tags=["storage"])
dynamodb = DynamoDBService()
s3 = S3Service()


# DynamoDB Endpoints
@router.post("/incidents")
async def save_incident(
    incident_id: str,
    analysis_result: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Save incident analysis to DynamoDB
    
    Args:
        incident_id: Incident ID
        analysis_result: Full analysis result
        metadata: Optional metadata
        
    Returns:
        Success status
    """
    try:
        success = await dynamodb.save_incident(
            incident_id=incident_id,
            analysis_result=analysis_result,
            metadata=metadata
        )
        
        if success:
            return {
                "status": "success",
                "incident_id": incident_id,
                "message": "Incident saved successfully"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to save incident"
            )
            
    except Exception as e:
        import traceback
        logger.error(f"Error saving incident: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save incident: {str(e)}"
        )


@router.get("/incidents/{incident_id}")
async def get_incident(
    incident_id: str,
    created_at: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Get incident from DynamoDB
    
    Args:
        incident_id: Incident ID
        created_at: Optional timestamp
        
    Returns:
        Incident data
    """
    try:
        incident = await dynamodb.get_incident(
            incident_id=incident_id,
            created_at=created_at
        )
        
        if not incident:
            raise HTTPException(
                status_code=404,
                detail=f"Incident {incident_id} not found"
            )
        
        return incident
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting incident: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get incident: {str(e)}"
        )


@router.get("/incidents")
async def list_incidents(
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    List incidents from DynamoDB
    
    Args:
        limit: Maximum number of incidents
        status: Optional status filter
        
    Returns:
        List of incidents
    """
    try:
        incidents = await dynamodb.list_incidents(
            limit=limit,
            status=status
        )
        
        return {
            "count": len(incidents),
            "incidents": incidents
        }
        
    except Exception as e:
        logger.error(f"Error listing incidents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list incidents: {str(e)}"
        )


@router.patch("/incidents/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    status: str,
    created_at: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Update incident status
    
    Args:
        incident_id: Incident ID
        status: New status
        created_at: Optional timestamp
        
    Returns:
        Success status
    """
    try:
        success = await dynamodb.update_incident_status(
            incident_id=incident_id,
            status=status,
            created_at=created_at
        )
        
        if success:
            return {
                "status": "success",
                "incident_id": incident_id,
                "new_status": status
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to update incident status"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating incident status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update incident status: {str(e)}"
        )


# S3 Endpoints
@router.post("/diagrams")
async def upload_diagram(
    incident_id: str,
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Upload architecture diagram to S3
    
    Args:
        incident_id: Incident ID
        file: Diagram image file
        
    Returns:
        Upload result with S3 key
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (PNG, JPG, etc.)"
            )
        
        # Read file data
        diagram_data = await file.read()
        
        if len(diagram_data) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="Image file too large (max 10MB)"
            )
        
        logger.info(f"Uploading diagram for incident {incident_id}: {file.filename}")
        
        # Upload to S3
        key = await s3.upload_diagram(
            incident_id=incident_id,
            diagram_data=diagram_data,
            filename=file.filename,
            content_type=file.content_type
        )
        
        if not key:
            raise HTTPException(
                status_code=500,
                detail="Failed to upload diagram"
            )
        
        return {
            "status": "success",
            "incident_id": incident_id,
            "s3_key": key,
            "filename": file.filename,
            "size_bytes": len(diagram_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error uploading diagram: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload diagram: {str(e)}"
        )


@router.get("/diagrams")
async def list_diagrams(
    incident_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100)
) -> Dict[str, Any]:
    """
    List diagrams in S3
    
    Args:
        incident_id: Optional incident ID filter
        limit: Maximum number of results
        
    Returns:
        List of diagrams
    """
    try:
        diagrams = await s3.list_diagrams(
            incident_id=incident_id,
            limit=limit
        )
        
        return {
            "count": len(diagrams),
            "diagrams": diagrams
        }
        
    except Exception as e:
        logger.error(f"Error listing diagrams: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list diagrams: {str(e)}"
        )


@router.get("/diagrams/{key:path}/url")
async def get_diagram_url(
    key: str,
    expiration: int = Query(3600, ge=60, le=86400)
) -> Dict[str, Any]:
    """
    Get presigned URL for diagram access
    
    Args:
        key: S3 object key
        expiration: URL expiration in seconds
        
    Returns:
        Presigned URL
    """
    try:
        url = await s3.get_presigned_url(
            key=key,
            expiration=expiration
        )
        
        if not url:
            raise HTTPException(
                status_code=404,
                detail=f"Diagram {key} not found"
            )
        
        return {
            "url": url,
            "expiration_seconds": expiration,
            "key": key
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting diagram URL: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get diagram URL: {str(e)}"
        )


@router.delete("/diagrams/{key:path}")
async def delete_diagram(key: str) -> Dict[str, Any]:
    """
    Delete diagram from S3
    
    Args:
        key: S3 object key
        
    Returns:
        Success status
    """
    try:
        success = await s3.delete_diagram(key)
        
        if success:
            return {
                "status": "success",
                "key": key,
                "message": "Diagram deleted successfully"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete diagram"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting diagram: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete diagram: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "storage-api",
        "dynamodb_table": dynamodb.table_name,
        "s3_bucket_diagrams": s3.diagrams_bucket
    }
