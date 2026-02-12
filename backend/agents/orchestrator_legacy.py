"""
LEGACY: Pre-Strands Orchestrator — Kept for reference only.

This was the original multi-agent orchestrator before migration to Strands Agents SDK.
It does NOT use Strands, MCP tools, or the new architecture.

Production uses: StrandsOrchestrator (agents/strands_orchestrator.py)
"""
import json
import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum

from agents.temporal_agent import TemporalAgent
from agents.visual_agent import VisualAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.voice_agent import VoiceAgent
from agents.documentation_agent import DocumentationAgent
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service
from utils.logger import logger


class AgentStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class Orchestrator:
    """
    LEGACY: Orchestrates multiple agents (pre-Strands).
    Use StrandsOrchestrator for production.
    """
    
    def __init__(self):
        self.temporal_agent = TemporalAgent()
        self.visual_agent = VisualAgent()
        self.risk_scorer = RiskScorerAgent()
        self.remediation_agent = RemediationAgent()
        self.voice_agent = VoiceAgent()
        self.documentation_agent = DocumentationAgent()
        self.dynamodb = DynamoDBService()
        self.s3 = S3Service()
        
        self.active_incidents: Dict[str, Dict[str, Any]] = {}
        
    async def analyze_incident(
        self,
        events: List[Dict[str, Any]],
        diagram_data: Optional[bytes] = None,
        incident_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Legacy incident analysis — see StrandsOrchestrator for production."""
        incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        start_time = time.time()
        try:
            logger.info(f"[LEGACY] Starting orchestrated analysis for {incident_id}")
            
            state = {
                "incident_id": incident_id,
                "status": "RUNNING",
                "started_at": datetime.utcnow().isoformat(),
                "agents": {},
                "results": {}
            }
            self.active_incidents[incident_id] = state
            
            try:
                await self.dynamodb.save_incident(incident_id, state, metadata={"status": "RUNNING"})
            except Exception as db_error:
                logger.warning(f"Failed to save initial state to DynamoDB: {db_error}")
            
            logger.info(f"[{incident_id}] Step 1: Temporal analysis")
            state["agents"]["temporal"] = {"status": AgentStatus.RUNNING, "started_at": datetime.utcnow().isoformat()}
            
            try:
                timeline = await self.temporal_agent.analyze_timeline(
                    events=events,
                    incident_type=incident_type or "Unknown"
                )
                state["agents"]["temporal"]["status"] = AgentStatus.COMPLETED
                state["results"]["timeline"] = timeline.dict() if hasattr(timeline, 'dict') else timeline
            except Exception as e:
                logger.error(f"[{incident_id}] Temporal analysis failed: {e}")
                state["agents"]["temporal"]["status"] = AgentStatus.FAILED
                state["agents"]["temporal"]["error"] = str(e)
            
            if diagram_data:
                logger.info(f"[{incident_id}] Step 2: Visual analysis")
                state["agents"]["visual"] = {"status": AgentStatus.RUNNING, "started_at": datetime.utcnow().isoformat()}
                try:
                    visual_analysis = await self.visual_agent.analyze_diagram(
                        image_data=diagram_data,
                        context=f"Analyzing architecture for incident {incident_id}"
                    )
                    state["agents"]["visual"]["status"] = AgentStatus.COMPLETED
                    state["results"]["visual"] = visual_analysis
                except Exception as e:
                    logger.error(f"[{incident_id}] Visual analysis failed: {e}")
                    state["agents"]["visual"]["status"] = AgentStatus.FAILED
                    state["agents"]["visual"]["error"] = str(e)
            else:
                state["agents"]["visual"] = {"status": AgentStatus.SKIPPED, "reason": "No diagram provided"}
            
            logger.info(f"[{incident_id}] Step 3: Risk scoring")
            state["agents"]["risk_scorer"] = {"status": AgentStatus.RUNNING, "started_at": datetime.utcnow().isoformat()}
            try:
                critical_events = events[:5] if len(events) > 5 else events
                risk_scores = []
                for event in critical_events:
                    try:
                        risk = await self.risk_scorer.score_event_risk(event)
                        risk_scores.append({"event": event.get("eventName", "Unknown"), "risk": risk})
                    except Exception as e:
                        logger.warning(f"Failed to score event: {e}")
                state["agents"]["risk_scorer"]["status"] = AgentStatus.COMPLETED
                state["results"]["risk_scores"] = risk_scores
            except Exception as e:
                logger.error(f"[{incident_id}] Risk scoring failed: {e}")
                state["agents"]["risk_scorer"]["status"] = AgentStatus.FAILED
                state["agents"]["risk_scorer"]["error"] = str(e)
            
            if state["results"].get("timeline"):
                logger.info(f"[{incident_id}] Step 4: Remediation planning")
                state["agents"]["remediation"] = {"status": AgentStatus.RUNNING, "started_at": datetime.utcnow().isoformat()}
                try:
                    timeline_data = state["results"]["timeline"]
                    plan = await self.remediation_agent.generate_remediation_plan(
                        incident_analysis={"timeline": timeline_data},
                        root_cause=timeline_data.get("root_cause", "Unknown"),
                        attack_pattern=timeline_data.get("attack_pattern", "Unknown"),
                        blast_radius=timeline_data.get("blast_radius", "Unknown"),
                        timeline_events=timeline_data.get("events", [])
                    )
                    state["agents"]["remediation"]["status"] = AgentStatus.COMPLETED
                    state["results"]["remediation_plan"] = plan
                except Exception as e:
                    logger.error(f"[{incident_id}] Remediation planning failed: {e}")
                    state["agents"]["remediation"]["status"] = AgentStatus.FAILED
                    state["agents"]["remediation"]["error"] = str(e)
            else:
                state["agents"]["remediation"] = {"status": AgentStatus.SKIPPED, "reason": "No timeline available"}
            
            try:
                await self.dynamodb.update_incident_state(incident_id, state)
            except Exception as db_error:
                logger.warning(f"DynamoDB update failed: {db_error}")
            
            if state["results"].get("timeline") and state["results"].get("remediation_plan"):
                logger.info(f"[{incident_id}] Step 5: Documentation generation")
                state["agents"]["documentation"] = {"status": AgentStatus.RUNNING, "started_at": datetime.utcnow().isoformat()}
                try:
                    docs = await self.documentation_agent.generate_documentation(
                        incident_id=incident_id,
                        incident_analysis={"timeline": state["results"]["timeline"]},
                        timeline=state["results"]["timeline"],
                        remediation_plan=state["results"]["remediation_plan"]
                    )
                    state["agents"]["documentation"]["status"] = AgentStatus.COMPLETED
                    state["results"]["documentation"] = docs
                except Exception as e:
                    logger.error(f"[{incident_id}] Documentation generation failed: {e}")
                    state["agents"]["documentation"]["status"] = AgentStatus.FAILED
                    state["agents"]["documentation"]["error"] = str(e)
            else:
                state["agents"]["documentation"] = {"status": AgentStatus.SKIPPED, "reason": "Missing timeline or remediation plan"}
            
            try:
                await self.dynamodb.update_incident_state(incident_id, state)
            except Exception as db_error:
                logger.warning(f"DynamoDB update failed: {db_error}")
            
            total_time = int((time.time() - start_time) * 1000)
            state["status"] = "COMPLETED"
            state["completed_at"] = datetime.utcnow().isoformat()
            state["total_time_ms"] = total_time
            
            final_result = {
                "incident_id": incident_id,
                "status": "completed",
                "analysis_time_ms": total_time,
                "agents": state["agents"],
                "results": state["results"],
                "model_used": "multi-agent-orchestration"
            }
            
            try:
                await self.dynamodb.save_incident(
                    incident_id=incident_id,
                    analysis_result=final_result,
                    metadata={"orchestrated": True, "agents_used": list(state["agents"].keys()), "incident_type": incident_type or "Unknown"}
                )
            except Exception as e:
                logger.warning(f"Failed to save incident to DynamoDB: {e}")
            
            logger.info(f"[{incident_id}] Orchestrated analysis complete in {total_time}ms")
            return final_result
            
        except Exception as e:
            import traceback
            logger.error(f"Orchestrated analysis failed: {e}")
            logger.error(traceback.format_exc())
            if incident_id in self.active_incidents:
                state = self.active_incidents[incident_id]
                state["status"] = "FAILED"
                state["error"] = str(e)
                if state.get("results", {}).get("timeline"):
                    total_time = int((time.time() - start_time) * 1000)
                    return {
                        "incident_id": incident_id,
                        "status": "partial",
                        "analysis_time_ms": total_time,
                        "agents": state.get("agents", {}),
                        "results": state.get("results", {}),
                        "error": str(e),
                        "model_used": "multi-agent-orchestration"
                    }
            raise
    
    def get_incident_state(self, incident_id: str) -> Optional[Dict[str, Any]]:
        return self.active_incidents.get(incident_id)
    
    def list_active_incidents(self) -> List[Dict[str, Any]]:
        return list(self.active_incidents.values())
