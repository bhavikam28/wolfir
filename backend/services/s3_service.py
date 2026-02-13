"""
S3 Service - Store architecture diagrams and analysis artifacts
"""
import asyncio
import boto3
from typing import Optional, Dict, Any
from datetime import datetime
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


class S3Service:
    """Service for S3 operations"""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Create session with profile if specified
        if self.settings.aws_profile and self.settings.aws_profile != "default":
            session = boto3.Session(profile_name=self.settings.aws_profile)
            logger.info(f"Using AWS profile: {self.settings.aws_profile}")
        else:
            session = boto3.Session()
            logger.info("Using default AWS credentials")
        
        self.client = session.client(
            's3',
            region_name=self.settings.aws_region
        )
        self.diagrams_bucket = self.settings.s3_bucket_diagrams
        self.cloudtrail_bucket = self.settings.s3_bucket_cloudtrail
        self._buckets_checked = False
        logger.info(f"S3 client initialized for region: {self.settings.aws_region}")
    
    async def _ensure_buckets_exist(self):
        """Ensure S3 buckets exist, create if they don't"""
        buckets = [
            (self.diagrams_bucket, "diagrams"),
            (self.cloudtrail_bucket, "cloudtrail logs")
        ]
        
        for bucket_name, purpose in buckets:
            try:
                await asyncio.to_thread(
                    self.client.head_bucket,
                    Bucket=bucket_name
                )
                logger.info(f"S3 bucket {bucket_name} exists")
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code == '404':
                    logger.info(f"Creating S3 bucket {bucket_name} for {purpose}")
                    try:
                        create_params = {'Bucket': bucket_name}
                        if self.settings.aws_region != 'us-east-1':
                            create_params['CreateBucketConfiguration'] = {'LocationConstraint': self.settings.aws_region}
                        await asyncio.to_thread(self.client.create_bucket, **create_params)
                        logger.info(f"S3 bucket {bucket_name} created")
                    except Exception as create_error:
                        logger.warning(f"Could not create bucket (may already exist or need permissions): {create_error}")
                else:
                    logger.warning(f"Error checking bucket {bucket_name}: {e}")
    
    async def upload_diagram(
        self,
        incident_id: str,
        diagram_data: bytes,
        filename: Optional[str] = None,
        content_type: str = "image/png"
    ) -> Optional[str]:
        """
        Upload architecture diagram to S3
        
        Args:
            incident_id: Incident ID
            diagram_data: Image bytes
            filename: Optional filename
            content_type: MIME type
            
        Returns:
            S3 object key or None
        """
        # Ensure bucket exists on first use
        if not self._buckets_checked:
            await self._ensure_buckets_exist()
            self._buckets_checked = True
        
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            key = f"diagrams/{incident_id}/{timestamp}_{filename or 'diagram.png'}"
            
            await asyncio.to_thread(
                self.client.put_object,
                Bucket=self.diagrams_bucket,
                Key=key,
                Body=diagram_data,
                ContentType=content_type,
                Metadata={
                    'incident_id': incident_id,
                    'uploaded_at': datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Uploaded diagram to S3: {key}")
            return key
            
        except Exception as e:
            logger.error(f"Error uploading diagram to S3: {e}")
            return None
    
    async def get_diagram(
        self,
        key: str
    ) -> Optional[bytes]:
        """
        Get diagram from S3
        
        Args:
            key: S3 object key
            
        Returns:
            Diagram bytes or None
        """
        try:
            response = await asyncio.to_thread(
                self.client.get_object,
                Bucket=self.diagrams_bucket,
                Key=key
            )
            
            diagram_data = response['Body'].read()
            logger.info(f"Retrieved diagram from S3: {key} ({len(diagram_data)} bytes)")
            return diagram_data
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"Diagram not found: {key}")
                return None
            logger.error(f"Error getting diagram from S3: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting diagram from S3: {e}")
            return None
    
    async def list_diagrams(
        self,
        incident_id: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """
        List diagrams in S3
        
        Args:
            incident_id: Optional incident ID filter
            limit: Maximum number of results
            
        Returns:
            List of diagram objects
        """
        try:
            prefix = f"diagrams/{incident_id}/" if incident_id else "diagrams/"
            
            response = await asyncio.to_thread(
                self.client.list_objects_v2,
                Bucket=self.diagrams_bucket,
                Prefix=prefix,
                MaxKeys=limit
            )
            
            diagrams = []
            for obj in response.get('Contents', []):
                diagrams.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'incident_id': incident_id or obj['Key'].split('/')[1] if '/' in obj['Key'] else None
                })
            
            logger.info(f"Listed {len(diagrams)} diagrams from S3")
            return diagrams
            
        except Exception as e:
            logger.error(f"Error listing diagrams from S3: {e}")
            return []
    
    async def delete_diagram(
        self,
        key: str
    ) -> bool:
        """
        Delete diagram from S3
        
        Args:
            key: S3 object key
            
        Returns:
            True if successful
        """
        try:
            await asyncio.to_thread(
                self.client.delete_object,
                Bucket=self.diagrams_bucket,
                Key=key
            )
            
            logger.info(f"Deleted diagram from S3: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting diagram from S3: {e}")
            return False
    
    async def get_presigned_url(
        self,
        key: str,
        expiration: int = 3600
    ) -> Optional[str]:
        """
        Generate presigned URL for diagram access
        
        Args:
            key: S3 object key
            expiration: URL expiration in seconds (default: 1 hour)
            
        Returns:
            Presigned URL or None
        """
        try:
            url = await asyncio.to_thread(
                self.client.generate_presigned_url,
                'get_object',
                Params={
                    'Bucket': self.diagrams_bucket,
                    'Key': key
                },
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated presigned URL for {key}")
            return url
            
        except Exception as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None
