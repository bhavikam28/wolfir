"""
Strands-Compatible Agent Orchestrator
Implements the AWS Strands Agents pattern for multi-agent coordination.

Each agent is defined as a tool with clear input/output contracts,
enabling the orchestrator to compose them into complex workflows.

This follows the Strands Agents SDK pattern:
- Tools are defined with schemas
- An orchestrator agent selects and chains tools
- State is managed between tool calls
"""
import json
import time
import uuid
from typing import Dict, Any, List, Optional, Callable, Awaitable
from datetime import datetime
from enum import Enum

from agents.temporal_agent import TemporalAgent
from agents.visual_agent import VisualAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.voice_agent import VoiceAgent
from agents.documentation_agent import DocumentationAgent
from services.bedrock_service import BedrockService
from utils.logger import logger


class ToolStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class StrandsTool:
    """Represents a tool in the Strands agent framework"""
    
    def __init__(
        self,
        name: str,
        description: str,
        handler: Callable[..., Awaitable[Dict[str, Any]]],
        model: str,
        input_schema: Dict[str, Any]
    ):
        self.name = name
        self.description = description
        self.handler = handler
        self.model = model
        self.input_schema = input_schema
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "model": self.model,
            "input_schema": self.input_schema
        }


class StrandsOrchestrator:
    """
    Strands-pattern orchestrator for multi-agent security analysis.
    
    Implements the AWS Strands Agents framework approach:
    1. Register tools (agents) with clear contracts
    2. Plan execution based on available data
    3. Execute tools in dependency order
    4. Manage shared state between tools
    5. Handle failures gracefully with partial results
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
        self.tools: Dict[str, StrandsTool] = {}
        self.execution_history: List[Dict[str, Any]] = []
        
        # Initialize underlying agents
        self._temporal = TemporalAgent()
        self._visual = VisualAgent()
        self._risk_scorer = RiskScorerAgent()
        self._remediation = RemediationAgent()
        self._voice = VoiceAgent()
        self._documentation = DocumentationAgent()
        
        # Register all tools
        self._register_tools()
    
    def _register_tools(self):
        """Register all available tools with the orchestrator"""
        
        self.register_tool(StrandsTool(
            name="temporal_analysis",
            description="Analyze CloudTrail events to build attack timeline, identify root cause, attack pattern, and blast radius",
            handler=self._run_temporal,
            model="amazon.nova-lite-v1:0",
            input_schema={"events": "List[Dict]", "incident_type": "str"}
        ))
        
        self.register_tool(StrandsTool(
            name="visual_analysis",
            description="Analyze architecture diagrams for security misconfigurations using multimodal vision",
            handler=self._run_visual,
            model="amazon.nova-pro-v1:0",
            input_schema={"diagram_data": "bytes", "context": "str"}
        ))
        
        self.register_tool(StrandsTool(
            name="risk_classification",
            description="Ultra-fast risk scoring of security events with severity and MITRE mapping",
            handler=self._run_risk_scoring,
            model="amazon.nova-micro-v1:0",
            input_schema={"events": "List[Dict]"}
        ))
        
        self.register_tool(StrandsTool(
            name="remediation_planning",
            description="Generate step-by-step remediation plans with AWS CLI commands",
            handler=self._run_remediation,
            model="amazon.nova-lite-v1:0",
            input_schema={"timeline": "Dict", "root_cause": "str", "attack_pattern": "str"}
        ))
        
        self.register_tool(StrandsTool(
            name="voice_interaction",
            description="Process natural language voice queries about incidents",
            handler=self._run_voice_query,
            model="amazon.nova-sonic-v1:0",
            input_schema={"query": "str", "context": "Dict"}
        ))
        
        self.register_tool(StrandsTool(
            name="documentation_generation",
            description="Generate JIRA tickets, Slack messages, and Confluence documentation",
            handler=self._run_documentation,
            model="amazon.nova-lite-v1:0",
            input_schema={"incident_id": "str", "timeline": "Dict", "remediation_plan": "Dict"}
        ))
    
    def register_tool(self, tool: StrandsTool):
        """Register a tool with the orchestrator"""
        self.tools[tool.name] = tool
        logger.info(f"Strands tool registered: {tool.name} ({tool.model})")
    
    async def plan_and_execute(
        self,
        events: List[Dict[str, Any]],
        diagram_data: Optional[bytes] = None,
        incident_type: Optional[str] = None,
        voice_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Plan and execute a multi-agent analysis workflow.
        
        The orchestrator determines which tools to call and in what order
        based on available inputs and dependencies between tools.
        
        Args:
            events: CloudTrail events to analyze
            diagram_data: Optional architecture diagram
            incident_type: Type of incident
            voice_query: Optional voice query to process
            
        Returns:
            Complete analysis with all tool outputs
        """
        incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        start_time = time.time()
        
        logger.info(f"[{incident_id}] Strands orchestrator: planning execution")
        
        # Shared state between tools
        state = {
            "incident_id": incident_id,
            "status": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
            "tools": {},
            "results": {},
            "execution_plan": []
        }
        
        # Step 1: Build execution plan based on inputs
        plan = self._build_execution_plan(
            has_events=bool(events),
            has_diagram=bool(diagram_data),
            has_voice_query=bool(voice_query)
        )
        state["execution_plan"] = [step["tool"] for step in plan]
        
        logger.info(f"[{incident_id}] Execution plan: {state['execution_plan']}")
        
        # Step 2: Execute plan
        for step in plan:
            tool_name = step["tool"]
            tool = self.tools.get(tool_name)
            
            if not tool:
                logger.warning(f"[{incident_id}] Tool not found: {tool_name}")
                continue
            
            state["tools"][tool_name] = {
                "status": ToolStatus.RUNNING,
                "model": tool.model,
                "started_at": datetime.utcnow().isoformat()
            }
            
            try:
                # Build tool arguments from shared state
                tool_args = step.get("args_builder", lambda s: {})(state)
                tool_args.update(step.get("extra_args", {}))
                
                # Add standard inputs
                if tool_name == "temporal_analysis":
                    tool_args["events"] = events
                    tool_args["incident_type"] = incident_type or "Unknown"
                elif tool_name == "visual_analysis":
                    tool_args["diagram_data"] = diagram_data
                    tool_args["context"] = f"Incident {incident_id}"
                elif tool_name == "risk_classification":
                    tool_args["events"] = events
                elif tool_name == "voice_interaction" and voice_query:
                    tool_args["query"] = voice_query
                    tool_args["context"] = state["results"]
                
                # Execute tool
                result = await tool.handler(**tool_args)
                
                state["tools"][tool_name]["status"] = ToolStatus.COMPLETED
                state["tools"][tool_name]["completed_at"] = datetime.utcnow().isoformat()
                state["results"][tool_name] = result
                
                # Record execution
                self.execution_history.append({
                    "incident_id": incident_id,
                    "tool": tool_name,
                    "model": tool.model,
                    "status": "completed",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                logger.info(f"[{incident_id}] Tool {tool_name} completed")
                
            except Exception as e:
                logger.error(f"[{incident_id}] Tool {tool_name} failed: {e}")
                state["tools"][tool_name]["status"] = ToolStatus.FAILED
                state["tools"][tool_name]["error"] = str(e)
        
        # Finalize
        total_time = int((time.time() - start_time) * 1000)
        state["status"] = "COMPLETED"
        state["completed_at"] = datetime.utcnow().isoformat()
        state["total_time_ms"] = total_time
        
        # Build final response (compatible with existing frontend)
        final_result = self._build_response(incident_id, state, total_time, incident_type)
        
        logger.info(f"[{incident_id}] Strands orchestration complete in {total_time}ms")
        
        return final_result
    
    def _build_execution_plan(
        self,
        has_events: bool,
        has_diagram: bool,
        has_voice_query: bool
    ) -> List[Dict[str, Any]]:
        """Build execution plan based on available inputs"""
        plan = []
        
        # Always start with temporal analysis if events available
        if has_events:
            plan.append({"tool": "temporal_analysis"})
            plan.append({"tool": "risk_classification"})
        
        # Visual analysis if diagram provided
        if has_diagram:
            plan.append({"tool": "visual_analysis"})
        
        # Remediation depends on temporal analysis
        if has_events:
            plan.append({
                "tool": "remediation_planning",
                "args_builder": lambda state: {
                    "timeline": state["results"].get("temporal_analysis", {}),
                    "root_cause": state["results"].get("temporal_analysis", {}).get("root_cause", "Unknown"),
                    "attack_pattern": state["results"].get("temporal_analysis", {}).get("attack_pattern", "Unknown"),
                }
            })
        
        # Documentation depends on temporal + remediation
        if has_events:
            plan.append({
                "tool": "documentation_generation",
                "args_builder": lambda state: {
                    "incident_id": state["incident_id"],
                    "timeline": state["results"].get("temporal_analysis", {}),
                    "remediation_plan": state["results"].get("remediation_planning", {}),
                }
            })
        
        # Voice query if provided
        if has_voice_query:
            plan.append({"tool": "voice_interaction"})
        
        return plan
    
    def _build_response(
        self,
        incident_id: str,
        state: Dict[str, Any],
        total_time: int,
        incident_type: Optional[str]
    ) -> Dict[str, Any]:
        """Build response compatible with existing frontend"""
        results = state["results"]
        
        # Map tool results to expected frontend format
        agents = {}
        for tool_name, tool_state in state["tools"].items():
            # Map tool names to agent names expected by frontend
            agent_name_map = {
                "temporal_analysis": "temporal",
                "visual_analysis": "visual",
                "risk_classification": "risk_scorer",
                "remediation_planning": "remediation",
                "documentation_generation": "documentation",
                "voice_interaction": "voice"
            }
            agent_name = agent_name_map.get(tool_name, tool_name)
            agents[agent_name] = {"status": tool_state["status"]}
        
        return {
            "incident_id": incident_id,
            "status": "completed",
            "analysis_time_ms": total_time,
            "agents": agents,
            "results": {
                "timeline": results.get("temporal_analysis"),
                "visual": results.get("visual_analysis"),
                "risk_scores": results.get("risk_classification"),
                "remediation_plan": results.get("remediation_planning"),
                "documentation": results.get("documentation_generation"),
                "voice": results.get("voice_interaction"),
            },
            "model_used": "strands-multi-agent-orchestration",
            "metadata": {
                "incident_type": incident_type,
                "execution_plan": state.get("execution_plan", []),
                "tools_used": list(state["tools"].keys()),
                "framework": "strands-agents"
            }
        }
    
    # ========== TOOL IMPLEMENTATIONS ==========
    
    async def _run_temporal(self, events: List[Dict], incident_type: str = "Unknown", **kwargs) -> Dict:
        """Run temporal analysis tool"""
        result = await self._temporal.analyze_timeline(events=events, incident_type=incident_type)
        return result.dict() if hasattr(result, 'dict') else result
    
    async def _run_visual(self, diagram_data: bytes, context: str = "", **kwargs) -> Dict:
        """Run visual analysis tool"""
        return await self._visual.analyze_diagram(image_data=diagram_data, context=context)
    
    async def _run_risk_scoring(self, events: List[Dict], **kwargs) -> List[Dict]:
        """Run risk scoring tool"""
        critical_events = events[:5] if len(events) > 5 else events
        scores = []
        for event in critical_events:
            try:
                risk = await self._risk_scorer.score_event_risk(event)
                scores.append({"event": event.get("eventName", "Unknown"), "risk": risk})
            except Exception as e:
                logger.warning(f"Risk scoring failed for event: {e}")
        return scores
    
    async def _run_remediation(self, timeline: Dict = None, root_cause: str = "Unknown", 
                                attack_pattern: str = "Unknown", **kwargs) -> Dict:
        """Run remediation planning tool"""
        return await self._remediation.generate_remediation_plan(
            incident_analysis={"timeline": timeline or {}},
            root_cause=root_cause,
            attack_pattern=attack_pattern,
            blast_radius=kwargs.get("blast_radius", "Unknown"),
            timeline_events=(timeline or {}).get("events", [])
        )
    
    async def _run_voice_query(self, query: str = "", context: Dict = None, **kwargs) -> Dict:
        """Run voice query tool"""
        return await self._voice.process_voice_query(query_text=query, incident_context=context)
    
    async def _run_documentation(self, incident_id: str = "", timeline: Dict = None, 
                                  remediation_plan: Dict = None, **kwargs) -> Dict:
        """Run documentation generation tool"""
        return await self._documentation.generate_documentation(
            incident_id=incident_id,
            incident_analysis={"timeline": timeline or {}},
            timeline=timeline or {},
            remediation_plan=remediation_plan
        )
    
    def get_registered_tools(self) -> List[Dict[str, Any]]:
        """Get all registered tools with their schemas"""
        return [tool.to_dict() for tool in self.tools.values()]
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get execution history"""
        return self.execution_history
