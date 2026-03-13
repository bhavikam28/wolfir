"""
Amazon Bedrock Guardrails — List and describe guardrails for wolfir.
Uses Bedrock control plane (bedrock client, not bedrock-runtime).
"""
from typing import Dict, Any, List
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


def _bedrock_client():
    """Create Bedrock control plane client."""
    import boto3
    settings = get_settings()
    if settings.aws_profile and settings.aws_profile != "default":
        session = boto3.Session(profile_name=settings.aws_profile)
    else:
        session = boto3.Session()
    return session.client("bedrock", region_name=settings.aws_region)


def list_guardrails(max_results: int = 20) -> Dict[str, Any]:
    """
    List all guardrails in the account.
    Requires bedrock:ListGuardrails permission.
    Returns:
        {
            "guardrails": [{"id", "arn", "name", "status", "version", "description"}],
            "error": str | None
        }
    """
    try:
        client = _bedrock_client()
        resp = client.list_guardrails(maxResults=max_results)
        items = resp.get("guardrails", [])
        return {
            "guardrails": [
                {
                    "id": g.get("id") or g.get("arn", "").split("/")[-1],
                    "arn": g.get("arn", ""),
                    "name": g.get("name", "Unnamed"),
                    "status": g.get("status", "UNKNOWN"),
                    "version": g.get("version", ""),
                    "description": g.get("description", "") or "",
                }
                for g in items
            ],
            "error": None,
        }
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        msg = str(e)
        logger.warning(f"ListGuardrails failed: {code} — {msg}")
        if code == "AccessDeniedException":
            return {"guardrails": [], "error": "Missing bedrock:ListGuardrails permission. Add to IAM policy."}
        return {"guardrails": [], "error": msg}
    except Exception as e:
        logger.exception("ListGuardrails failed")
        return {"guardrails": [], "error": str(e)}
