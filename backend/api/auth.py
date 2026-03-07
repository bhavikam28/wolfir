"""
AWS Authentication API endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound

from utils.config import get_settings
from utils.logger import logger

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.get("/test-connection")
async def test_aws_connection(
    profile: Optional[str] = Query(None, description="AWS profile name")
) -> Dict[str, Any]:
    """
    Test AWS connection using the specified profile or default credentials
    
    This endpoint:
    1. Attempts to get AWS caller identity (whoami)
    2. Verifies CloudTrail access
    3. Verifies Bedrock access
    
    Args:
        profile: AWS profile name (optional, uses default if not provided)
        
    Returns:
        Connection test results with account info and permissions
    """
    try:
        # Create session with profile if specified
        if profile:
            session = boto3.Session(profile_name=profile)
            logger.info(f"Testing AWS connection with profile: {profile}")
        else:
            session = boto3.Session()
            logger.info("Testing AWS connection with default credentials")
        
        results = {
            "connected": False,
            "profile_used": profile or "default",
            "account_id": None,
            "user_arn": None,
            "permissions": {
                "cloudtrail": False,
                "bedrock": False
            },
            "error": None
        }
        
        # Test 1: Get caller identity (basic AWS access)
        try:
            sts_client = session.client('sts', region_name=settings.aws_region)
            identity = sts_client.get_caller_identity()
            results["account_id"] = identity.get("Account")
            results["user_arn"] = identity.get("Arn")
            results["connected"] = True
            logger.info(f"Successfully connected to AWS account: {results['account_id']}")
        except (NoCredentialsError, ProfileNotFound) as e:
            results["error"] = f"Credentials not found: {str(e)}"
            logger.error(f"Credentials error: {e}")
            return results
        except ClientError as e:
            results["error"] = f"AWS API error: {str(e)}"
            logger.error(f"AWS API error: {e}")
            return results
        
        # Test 2: Verify CloudTrail access
        try:
            cloudtrail_client = session.client('cloudtrail', region_name=settings.aws_region)
            # Try to list trails (read-only operation)
            cloudtrail_client.list_trails()
            results["permissions"]["cloudtrail"] = True
            logger.info("CloudTrail access verified")
        except ClientError as e:
            logger.warning(f"CloudTrail access test failed: {e}")
            results["permissions"]["cloudtrail"] = False
        
        # Test 3: Verify Bedrock access (list_foundation_models is on bedrock control plane, not bedrock-runtime)
        try:
            bedrock_client = session.client('bedrock', region_name=settings.aws_region)
            bedrock_client.list_foundation_models()
            results["permissions"]["bedrock"] = True
            logger.info("Bedrock access verified")
        except ClientError as e:
            logger.warning(f"Bedrock access test failed: {e}")
            results["permissions"]["bedrock"] = False
        
        return results
        
    except Exception as e:
        logger.error(f"Unexpected error testing AWS connection: {e}")
        from utils.error_messages import user_friendly_message
        raise HTTPException(
            status_code=500,
            detail=user_friendly_message(e, "Connection test failed. Please check your AWS configuration.")
        )


@router.get("/available-profiles")
async def list_available_profiles() -> Dict[str, Any]:
    """
    List available AWS CLI profiles from ~/.aws/credentials
    
    Returns:
        List of available profile names
    """
    try:
        import os
        from pathlib import Path
        
        # Get AWS credentials file path
        aws_dir = Path.home() / ".aws"
        credentials_file = aws_dir / "credentials"
        config_file = aws_dir / "config"
        
        profiles = []
        
        # Read from credentials file
        if credentials_file.exists():
            with open(credentials_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('[') and line.endswith(']'):
                        profile_name = line[1:-1]
                        if profile_name != 'default':
                            profiles.append(profile_name)
        
        # Also check config file for SSO profiles
        if config_file.exists():
            with open(config_file, 'r') as f:
                current_profile = None
                for line in f:
                    line = line.strip()
                    if line.startswith('[') and line.endswith(']'):
                        current_profile = line[1:-1].replace('profile ', '')
                        if current_profile not in profiles:
                            profiles.append(current_profile)
        
        return {
            "profiles": sorted(list(set(profiles))),
            "default_available": credentials_file.exists() or config_file.exists()
        }
        
    except Exception as e:
        logger.error(f"Error listing AWS profiles: {e}")
        return {
            "profiles": [],
            "default_available": False,
            "error": str(e)
        }


@router.get("/health")
async def health_check() -> Dict[str, str]:
    return {"status": "healthy", "service": "auth-api"}
