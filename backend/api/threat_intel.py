"""
Threat Intelligence API — Lookup IP reputation (AbuseIPDB, VirusTotal, demo)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.threat_intel import lookup_ip_reputation, extract_ips_from_context, enrich_timeline_with_threat_intel
from utils.logger import logger

router = APIRouter(prefix="/api/threat-intel", tags=["threat-intel"])


class LookupRequest(BaseModel):
    ip: str


class TimelineEnrichRequest(BaseModel):
    events: Optional[List[dict]] = None


@router.post("/lookup")
async def lookup_ip(req: LookupRequest) -> dict:
    """Look up threat reputation for a single IP."""
    try:
        return lookup_ip_reputation(req.ip)
    except Exception as e:
        logger.error(f"Threat intel lookup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enrich-timeline")
async def enrich_timeline(req: TimelineEnrichRequest) -> dict:
    """Extract IPs from timeline events and return threat intel cache."""
    try:
        cache = enrich_timeline_with_threat_intel(req.events or [])
        return {"cache": cache}
    except Exception as e:
        logger.error(f"Threat intel enrichment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "threat-intel"}
