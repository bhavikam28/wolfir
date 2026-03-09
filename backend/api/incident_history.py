"""
Incident History API — Cross-incident memory and correlation endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from services.incident_memory import get_incident_memory
from services.embedding_service import embed_text, cosine_similarity
from utils.logger import logger

router = APIRouter(prefix="/api/incidents", tags=["incidents"])
DEFAULT_ACCOUNT = "demo-account"


class SearchRequest(BaseModel):
    query: str = ""
    account_id: str = DEFAULT_ACCOUNT
    limit: int = 20
@router.get("")
async def list_incidents(
    account_id: str = Query(default=DEFAULT_ACCOUNT),
    limit: int = Query(default=50, ge=1, le=100),
) -> Dict[str, Any]:
    """List all incidents (paginated)."""
    try:
        memory = get_incident_memory()
        incidents = await memory.list_all_incidents(account_id=account_id, limit=limit)
        return {
            "count": len(incidents),
            "account_id": account_id,
            "incidents": incidents,
        }
    except Exception as e:
        logger.error(f"List incidents failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats(
    account_id: str = Query(default=DEFAULT_ACCOUNT),
) -> Dict[str, Any]:
    """Aggregated stats for dashboard."""
    try:
        memory = get_incident_memory()
        incidents = await memory.list_all_incidents(account_id=account_id, limit=200)
        severity_counts = {}
        attack_types = {}
        mitre_freq = {}
        for inc in incidents:
            s = inc.get("severity", "LOW")
            severity_counts[s] = severity_counts.get(s, 0) + 1
            at = inc.get("attack_type", "Unknown")
            attack_types[at] = attack_types.get(at, 0) + 1
            for t in inc.get("mitre_techniques", []):
                mitre_freq[t] = mitre_freq.get(t, 0) + 1
        top_attack = sorted(attack_types.items(), key=lambda x: -x[1])[:5]
        top_mitre = sorted(mitre_freq.items(), key=lambda x: -x[1])[:8]
        return {
            "total_incidents": len(incidents),
            "account_id": account_id,
            "severity_distribution": severity_counts,
            "top_attack_types": [{"attack_type": k, "count": v} for k, v in top_attack],
            "top_mitre_techniques": [{"technique": k, "count": v} for k, v in top_mitre],
        }
    except Exception as e:
        logger.error(f"Stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlations")
async def get_correlations(
    account_id: str = Query(default=DEFAULT_ACCOUNT),
) -> Dict[str, Any]:
    """Get active correlations/campaigns for the account."""
    try:
        memory = get_incident_memory()
        incidents = await memory.list_all_incidents(account_id=account_id, limit=20)
        if len(incidents) < 2:
            return {
                "active_campaigns": [],
                "campaign_probability": 0.0,
                "pattern_matches": [],
                "message": "Need at least 2 incidents to detect correlations.",
            }
        # Use most recent as "current" for correlation
        current = incidents[0]
        current_full = {
            "incident_id": current["incident_id"],
            "results": {"timeline": {}, "risk_scores": []},
            "metadata": {"incident_type": current.get("attack_type")},
            "timeline": {"events": []},
        }
        corr = await memory.correlate_incident(current_full, account_id=account_id)
        return {
            "active_campaigns": [
                {
                    "incident_ids": [p["incident_id"] for p in corr.pattern_matches],
                    "campaign_probability": corr.campaign_probability,
                    "correlation_summary": corr.correlation_summary,
                    "technique_overlaps": len(corr.technique_overlaps),
                }
            ] if corr.pattern_matches or corr.campaign_probability > 0.5 else [],
            "campaign_probability": corr.campaign_probability,
            "pattern_matches": corr.pattern_matches,
            "technique_overlaps": corr.technique_overlaps,
        }
    except Exception as e:
        logger.error(f"Correlations failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{incident_id}/correlate")
async def force_recorrelate(
    incident_id: str,
    account_id: str = Query(default=DEFAULT_ACCOUNT),
) -> Dict[str, Any]:
    """Force re-correlate a specific incident with others."""
    try:
        memory = get_incident_memory()
        inc = await memory.get_incident_by_id(incident_id, account_id=account_id)
        if not inc:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
        current = {
            "incident_id": inc["incident_id"],
            "results": {"timeline": {}, "risk_scores": []},
            "metadata": {"incident_type": inc.get("attack_type")},
            "timeline": {"events": []},
        }
        corr = await memory.correlate_incident(current, account_id=account_id)
        return {
            "incident_id": incident_id,
            "correlation_summary": corr.correlation_summary,
            "campaign_probability": corr.campaign_probability,
            "pattern_matches": corr.pattern_matches,
            "technique_overlaps": corr.technique_overlaps,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Force correlate failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{incident_id}/similar")
async def get_similar_incidents(
    incident_id: str,
    account_id: str = Query(default=DEFAULT_ACCOUNT),
    limit: int = Query(default=5, ge=1, le=10),
) -> Dict[str, Any]:
    """Find semantically similar incidents using Nova Multimodal Embeddings."""
    try:
        memory = get_incident_memory()
        inc = await memory.get_incident_by_id(incident_id, account_id=account_id)
        if not inc:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
        query_text = f"{inc.get('summary', '')} {inc.get('attack_type', '')} {' '.join(inc.get('mitre_techniques', []))}".strip()
        query_emb = await embed_text(query_text)
        if not query_emb:
            return {"incident_id": incident_id, "similar": [], "message": "Embedding unavailable (Bedrock)."}
        incidents = await memory.list_all_incidents(account_id=account_id, limit=30)
        scored = []
        for other in incidents:
            if other.get("incident_id") == incident_id:
                continue
            other_text = f"{other.get('summary', '')} {other.get('attack_type', '')} {' '.join(other.get('mitre_techniques', []))}".strip()
            other_emb = await embed_text(other_text)
            if other_emb:
                sim = cosine_similarity(query_emb, other_emb)
                scored.append((sim, other))
        scored.sort(key=lambda x: -x[0])
        similar = [{"similarity": round(s * 100, 1), "incident": i} for s, i in scored[:limit]]
        return {"incident_id": incident_id, "similar": similar, "model": "amazon.nova-2-multimodal-embeddings-v1:0"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar incidents failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    account_id: str = Query(default=DEFAULT_ACCOUNT),
) -> Dict[str, Any]:
    """Get single incident detail."""
    try:
        memory = get_incident_memory()
        inc = await memory.get_incident_by_id(incident_id, account_id=account_id)
        if not inc:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
        return inc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get incident failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_incidents(body: SearchRequest = Body(...)) -> Dict[str, Any]:
    """Search incidents by query (simple text match for now)."""
    try:
        memory = get_incident_memory()
        incidents = await memory.list_all_incidents(account_id=body.account_id, limit=100)
        q = (body.query or "").lower().strip()
        if not q:
            return {"count": len(incidents), "incidents": incidents[:body.limit]}
        matches = []
        for inc in incidents:
            if (q in (inc.get("incident_id") or "").lower() or
                q in (inc.get("attack_type") or "").lower() or
                q in (inc.get("summary") or "").lower() or
                any(q in (t or "").lower() for t in inc.get("mitre_techniques", []))):
                matches.append(inc)
        return {"count": len(matches), "incidents": matches[:body.limit]}
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
