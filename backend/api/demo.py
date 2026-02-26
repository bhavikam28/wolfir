"""
Demo API endpoints for sample data
"""
from fastapi import APIRouter
from typing import Dict, Any, List

from utils.mock_data import (
    generate_crypto_mining_scenario,
    generate_data_exfiltration_scenario,
    generate_privilege_escalation_scenario,
    generate_unauthorized_access_scenario
)

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/scenarios")
async def list_scenarios() -> Dict[str, Any]:
    """List available demo scenarios"""
    return {
        "scenarios": [
            {
                "id": "crypto-mining",
                "name": "Cryptocurrency Mining Attack",
                "description": "Compromised IAM role used to launch crypto mining instances",
                "severity": "CRITICAL",
                "event_count": 9
            },
            {
                "id": "data-exfiltration",
                "name": "Data Exfiltration",
                "description": "Unauthorized access and download of sensitive data",
                "severity": "HIGH",
                "event_count": 3
            },
            {
                "id": "privilege-escalation",
                "name": "Privilege Escalation",
                "description": "IAM user escalates privileges through role assumption",
                "severity": "CRITICAL",
                "event_count": 4
            },
            {
                "id": "unauthorized-access",
                "name": "Unauthorized Access",
                "description": "External actor accessing sensitive resources",
                "severity": "HIGH",
                "event_count": 3
            }
        ]
    }


@router.get("/scenarios/crypto-mining")
async def get_crypto_mining_scenario() -> Dict[str, Any]:
    """Get crypto mining demo scenario events"""
    events = generate_crypto_mining_scenario()
    return {
        "scenario": "crypto-mining",
        "name": "Cryptocurrency Mining Attack",
        "events": events,
        "event_count": len(events)
    }


@router.get("/scenarios/data-exfiltration")
async def get_data_exfiltration_scenario() -> Dict[str, Any]:
    """Get data exfiltration demo scenario events"""
    events = generate_data_exfiltration_scenario()
    return {
        "scenario": "data-exfiltration",
        "name": "Data Exfiltration",
        "events": events,
        "event_count": len(events)
    }


@router.get("/scenarios/privilege-escalation")
async def get_privilege_escalation_scenario() -> Dict[str, Any]:
    """Get privilege escalation demo scenario events"""
    events = generate_privilege_escalation_scenario()
    return {
        "scenario": "privilege-escalation",
        "name": "Privilege Escalation",
        "events": events,
        "event_count": len(events)
    }


@router.get("/scenarios/unauthorized-access")
async def get_unauthorized_access_scenario() -> Dict[str, Any]:
    """Get unauthorized access demo scenario events"""
    events = generate_unauthorized_access_scenario()
    return {
        "scenario": "unauthorized-access",
        "name": "Unauthorized Access",
        "events": events,
        "event_count": len(events)
    }


# Fast demo — returns pre-computed result without calling Bedrock (~2s vs ~45s)
@router.get("/quick/{scenario_id}")
async def get_quick_demo(scenario_id: str) -> Dict[str, Any]:
    """Return pre-computed orchestration result for instant demo.
    
    Use this when you need a fast demo without Bedrock API calls.
    Real analysis uses /api/orchestration/analyze-incident.
    Saves to incident memory so Incident History and Aria correlation work.
    """
    from utils.demo_results import get_quick_demo_result
    from services.incident_memory import get_incident_memory

    names = {
        "crypto-mining": "Cryptocurrency Mining Attack",
        "data-exfiltration": "Data Exfiltration",
        "privilege-escalation": "Privilege Escalation",
        "unauthorized-access": "Unauthorized Access",
    }
    incident_type = names.get(scenario_id, "Security Incident")
    result = get_quick_demo_result(scenario_id, incident_type)

    # Save to incident memory so Incident History and Aria correlation work
    try:
        memory = get_incident_memory()
        incident_data = {
            "incident_id": result["incident_id"],
            "results": result["results"],
            "metadata": result.get("metadata", {}),
            "timeline": result["results"].get("timeline"),
        }
        await memory.save_incident(incident_data, account_id="demo-account")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to save demo to incident memory: {e}")

    return result
