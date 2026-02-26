"""
Approval Manager — Human-in-the-loop workflow for risky remediations.

Stores pending approvals in memory (demo). For production, use DynamoDB.
"""
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime


_pending: Dict[str, Dict[str, Any]] = {}
_execution_proofs: Dict[str, List[Dict[str, Any]]] = {}


def create_pending_approval(
    incident_id: str,
    step_id: str,
    step_action: str,
    target: str,
    execution_params: Dict[str, Any],
) -> str:
    token = str(uuid.uuid4())
    _pending[token] = {
        "token": token,
        "incident_id": incident_id,
        "step_id": step_id,
        "step_action": step_action,
        "target": target,
        "params": execution_params,
        "created_at": datetime.utcnow().isoformat(),
        "status": "PENDING",
    }
    return token


def get_pending(token: str) -> Optional[Dict[str, Any]]:
    return _pending.get(token)


def approve_and_get(token: str) -> Optional[Dict[str, Any]]:
    p = _pending.get(token)
    if not p or p.get("status") != "PENDING":
        return None
    p["status"] = "APPROVED"
    p["approved_at"] = datetime.utcnow().isoformat()
    return p


def list_pending(incident_id: Optional[str] = None) -> List[Dict[str, Any]]:
    items = [v for v in _pending.values() if v.get("status") == "PENDING"]
    if incident_id:
        items = [i for i in items if i.get("incident_id") == incident_id]
    return items


def store_execution_proof(incident_id: str, proof: Dict[str, Any]) -> None:
    if incident_id not in _execution_proofs:
        _execution_proofs[incident_id] = []
    _execution_proofs[incident_id].append(proof)


def get_execution_proofs(incident_id: str) -> List[Dict[str, Any]]:
    return _execution_proofs.get(incident_id, [])
