"""
Strands Agents SDK Orchestrator for wolfir
Uses the REAL strands-agents package for multi-agent security analysis.

Each security capability is registered as a Strands @tool.
The Strands Agent uses Amazon Nova 2 Lite to plan and execute
the optimal sequence of tools based on the incident context.

Integrates AWS MCP server tools alongside core Nova agent tools:
- CloudTrail MCP — event lookup, anomaly scanning
- IAM MCP — user/role auditing, policy analysis
- CloudWatch MCP — security metrics, billing anomalies
- Nova Canvas MCP — visual report generation

pip install strands-agents strands-agents-tools
"""
import json
import time
import uuid
import asyncio
import threading
import concurrent.futures
from typing import Dict, Any, List, Optional
from datetime import datetime

from strands import Agent
from strands.tools import tool

from agents.temporal_agent import TemporalAgent
from agents.visual_agent import VisualAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.voice_agent import VoiceAgent
from agents.documentation_agent import DocumentationAgent
from mcp_servers.cloudtrail_mcp import get_cloudtrail_mcp
from mcp_servers.iam_mcp import get_iam_mcp
from mcp_servers.cloudwatch_mcp import get_cloudwatch_mcp
from mcp_servers.security_hub_mcp import get_security_hub_mcp
from mcp_servers.nova_canvas_mcp import get_nova_canvas_mcp
from mcp_servers.ai_security_mcp import get_ai_security_mcp
from services.incident_memory import get_incident_memory
from services.knowledge_base_service import is_knowledge_base_configured, retrieve_and_generate as kb_retrieve_and_generate
from utils.config import get_settings
from utils.logger import logger


# ========== ASYNC BRIDGE ==========
# Strands tools are synchronous. Our agents use async Bedrock calls.
# A single persistent worker thread owns one event loop for the process lifetime,
# eliminating the per-call loop creation/destruction overhead of the old pattern.

_WORKER_LOOP: asyncio.AbstractEventLoop = asyncio.new_event_loop()
_WORKER_THREAD: threading.Thread = threading.Thread(
    target=_WORKER_LOOP.run_forever,
    daemon=True,
    name="wolfir-async-worker",
)
_WORKER_THREAD.start()


def _run_async(coro):
    """Submit a coroutine to the persistent worker loop and block until done."""
    future = asyncio.run_coroutine_threadsafe(coro, _WORKER_LOOP)
    try:
        return future.result(timeout=180)
    except concurrent.futures.TimeoutError:
        future.cancel()
        raise TimeoutError("Async tool call timed out after 180s")


# ========== SHARED AGENT INSTANCES ==========
# Pre-initialize agents to avoid recreating Bedrock clients per tool call.

_temporal_agent = None
_risk_scorer_agent = None
_remediation_agent = None
_documentation_agent = None
_voice_agent = None
_visual_agent = None


def _get_agents():
    """Lazy-initialize agents on first use."""
    global _temporal_agent, _risk_scorer_agent, _remediation_agent
    global _documentation_agent, _voice_agent, _visual_agent
    
    if _temporal_agent is None:
        _temporal_agent = TemporalAgent()
        _risk_scorer_agent = RiskScorerAgent()
        _remediation_agent = RemediationAgent()
        _documentation_agent = DocumentationAgent()
        _voice_agent = VoiceAgent()
        _visual_agent = VisualAgent()
    
    return {
        "temporal": _temporal_agent,
        "risk_scorer": _risk_scorer_agent,
        "remediation": _remediation_agent,
        "documentation": _documentation_agent,
        "voice": _voice_agent,
        "visual": _visual_agent,
    }


# ================================================================
# CORE STRANDS TOOLS — Nova Agent Wrappers
# ================================================================

@tool
def analyze_security_timeline(events_json: str, incident_type: str = "Unknown") -> str:
    """Analyze CloudTrail security events to build an attack timeline.
    
    Identifies root cause, attack pattern, and blast radius using Nova 2 Lite
    for temporal reasoning across event sequences.
    
    Args:
        events_json: JSON string of CloudTrail events to analyze (or array of events)
        incident_type: Type of incident (crypto-mining, data-exfiltration, etc.)
    
    Returns:
        JSON string with timeline analysis including root_cause, attack_pattern,
        blast_radius, confidence score, and ordered events with severity levels.
    """
    agents = _get_agents()
    parsed = json.loads(events_json) if isinstance(events_json, str) else events_json
    # Handle MCP error response — don't pass to temporal agent
    if isinstance(parsed, dict) and parsed.get("error"):
        return json.dumps({
            "events": [], "root_cause": "N/A", "attack_pattern": "N/A",
            "blast_radius": "Unknown", "confidence": 0.0,
            "error": parsed["error"], "_api_error": True,
            "message": f"AWS API error — no events to analyze: {parsed['error']}"
        })
    events = parsed.get("events", parsed) if isinstance(parsed, dict) else parsed
    if not isinstance(events, list):
        events = [events] if events else []

    # Empty events — avoid hallucinated timelines from Nova
    if len(events) == 0:
        return json.dumps({
            "events": [],
            "root_cause": "No events to analyze",
            "attack_pattern": "N/A",
            "blast_radius": "N/A",
            "confidence": 0.0,
            "analysis_summary": "No CloudTrail events were found in the specified time range.",
        })

    result = _run_async(agents["temporal"].analyze_timeline(
        events=events,
        incident_type=incident_type
    ))

    return json.dumps(result.dict() if hasattr(result, 'dict') else result, default=str)


@tool
def score_event_risk(event_json: str) -> str:
    """Score the risk level of a single CloudTrail security event.
    
    Uses Nova Micro for ultra-fast (<1s) threat classification with
    severity rating, confidence score, and MITRE ATT&CK mapping.
    
    Args:
        event_json: JSON string of a single CloudTrail event
    
    Returns:
        JSON string with risk_level, severity, confidence, and mitre_mapping.
    """
    agents = _get_agents()
    event = json.loads(event_json) if isinstance(event_json, str) else event_json
    
    result = _run_async(agents["risk_scorer"].score_event_risk(event))
    return json.dumps(result, default=str)


@tool
def generate_remediation(root_cause: str, attack_pattern: str, 
                         blast_radius: str = "Unknown",
                         timeline_events_json: str = "[]") -> str:
    """Generate a step-by-step remediation plan for a security incident.
    
    Creates actionable remediation steps with specific AWS CLI commands,
    IAM policy fixes, and compliance-aligned recommendations.
    
    Args:
        root_cause: Root cause of the incident
        attack_pattern: Identified attack pattern
        blast_radius: Scope of impact
        timeline_events_json: JSON string of timeline events
    
    Returns:
        JSON string with ordered remediation steps, AWS CLI commands, and priorities.
    """
    agents = _get_agents()
    timeline_events = json.loads(timeline_events_json) if isinstance(timeline_events_json, str) else timeline_events_json
    
    result = _run_async(agents["remediation"].generate_remediation_plan(
        incident_analysis={"timeline": {}},
        root_cause=root_cause,
        attack_pattern=attack_pattern,
        blast_radius=blast_radius,
        timeline_events=timeline_events
    ))
    return json.dumps(result, default=str)


@tool
def generate_incident_documentation(incident_id: str, timeline_json: str,
                                     remediation_json: str = "{}") -> str:
    """Generate incident documentation for JIRA, Slack, and Confluence.
    
    Creates structured documentation including JIRA ticket content,
    Slack notification messages, and Confluence post-mortem pages.
    
    Args:
        incident_id: Incident identifier
        timeline_json: JSON string of timeline analysis
        remediation_json: JSON string of remediation plan
    
    Returns:
        JSON string with documentation for jira, slack, and confluence platforms.
    """
    agents = _get_agents()
    timeline = json.loads(timeline_json) if isinstance(timeline_json, str) else timeline_json
    remediation = json.loads(remediation_json) if isinstance(remediation_json, str) else remediation_json
    
    result = _run_async(agents["documentation"].generate_documentation(
        incident_id=incident_id,
        incident_analysis={"timeline": timeline},
        timeline=timeline,
        remediation_plan=remediation
    ))
    return json.dumps(result, default=str)


@tool
def query_security_incident(query: str, incident_context_json: str = "{}") -> str:
    """Answer natural language questions about a security incident.
    
    Processes conversational queries about attack patterns, timelines,
    remediation options, compliance impacts, and cost estimates.
    
    Args:
        query: Natural language question about the incident
        incident_context_json: JSON string of current incident data
    
    Returns:
        JSON string with response_text, action, severity_assessment, and suggestions.
    """
    agents = _get_agents()
    context = json.loads(incident_context_json) if isinstance(incident_context_json, str) else incident_context_json
    
    result = _run_async(agents["voice"].process_voice_query(
        query_text=query,
        incident_context=context if context else None
    ))
    return json.dumps(result)


# ================================================================
# AWS MCP SERVER TOOLS — Strands-registered wrappers
# ================================================================

@tool
def cloudtrail_lookup(event_category: str = "all", days_back: int = 7, max_results: int = 50) -> str:
    """Lookup CloudTrail events using the official CloudTrail MCP server pattern.
    
    Filters events by security category and classifies severity.
    Categories: iam, network, data, compute, or all.
    
    Args:
        event_category: Filter category
        days_back: Days to look back
        max_results: Maximum events
    
    Returns:
        JSON with events, severity summary, and risk indicators.
    """
    try:
        ct = get_cloudtrail_mcp()
        result = _run_async(ct.lookup_security_events(event_category, days_back, max_results))
        if isinstance(result, dict) and result.get("error"):
            logger.warning(f"CloudTrail MCP returned error: {result['error']}")
            return json.dumps({"error": result["error"], "events": result.get("events", []),
                              "_api_error": True, "message": f"CloudTrail API error: {result['error']}"})
        return json.dumps(result)
    except Exception as e:
        logger.error(f"CloudTrail lookup tool failed: {e}")
        return json.dumps({"error": str(e), "events": [], "source": "cloudtrail-mcp-server"})


@tool
def cloudtrail_anomaly_scan(days_back: int = 1) -> str:
    """Scan CloudTrail for security anomalies using the CloudTrail MCP server.
    
    Detects root account usage, console logins without MFA,
    access key creation, security group changes, and evasion attempts.
    
    Args:
        days_back: Days to scan
    
    Returns:
        JSON with anomalies found and risk assessment.
    """
    try:
        ct = get_cloudtrail_mcp()
        result = _run_async(ct.scan_for_anomalies(days_back))
        if isinstance(result, dict) and result.get("error"):
            logger.warning(f"CloudTrail anomaly scan returned error: {result['error']}")
            return json.dumps({"error": result["error"], "anomalies": result.get("anomalies", []),
                              "_api_error": True, "message": f"CloudTrail API error: {result['error']}"})
        return json.dumps(result)
    except Exception as e:
        logger.error(f"CloudTrail anomaly scan tool failed: {e}")
        return json.dumps({"error": str(e), "anomalies": [], "source": "cloudtrail-mcp-server"})


@tool
def iam_audit(audit_type: str = "users") -> str:
    """Audit IAM users or roles using custom IAM MCP (boto3, awslabs-inspired).
    
    Checks MFA compliance, access key age, admin access,
    trust policies, and cross-account configurations.
    
    Args:
        audit_type: "users" or "roles"
    
    Returns:
        JSON with findings, risk scores, and remediation commands.
    """
    try:
        iam = get_iam_mcp()
        if audit_type == "roles":
            result = _run_async(iam.audit_iam_roles())
        else:
            result = _run_async(iam.audit_iam_users())
        if isinstance(result, dict) and result.get("error"):
            logger.warning(f"IAM audit returned error: {result['error']}")
            return json.dumps({"error": result["error"], "findings": result.get("findings", []),
                              "_api_error": True, "message": f"IAM API error: {result['error']}"})
        return json.dumps(result)
    except Exception as e:
        logger.error(f"IAM audit tool failed: {e}")
        return json.dumps({"error": str(e), "findings": [], "source": "iam-mcp-server"})


@tool
def iam_policy_analysis(policy_arn: str) -> str:
    """Analyze a specific IAM policy using the IAM MCP server.
    
    Examines policy for wildcard actions, wildcard resources,
    overly broad permissions, and security violations.
    
    Args:
        policy_arn: ARN of the policy to analyze
    
    Returns:
        JSON with permissions, findings, and risk level.
    """
    try:
        iam = get_iam_mcp()
        result = _run_async(iam.analyze_policy(policy_arn))
        if isinstance(result, dict) and result.get("error"):
            logger.warning(f"IAM policy analysis returned error: {result['error']}")
            return json.dumps({"error": result["error"], "_api_error": True,
                              "message": f"IAM policy API error: {result['error']}"})
        return json.dumps(result)
    except Exception as e:
        logger.error(f"IAM policy analysis tool failed: {e}")
        return json.dumps({"error": str(e), "policy_arn": policy_arn, "source": "iam-mcp-server"})


@tool
def cloudwatch_security_check() -> str:
    """Check CloudWatch for security alarms and EC2 anomalies.
    
    Uses the CloudWatch MCP server to monitor security alarms
    and detect crypto-mining or data exfiltration via metrics.
    
    Returns:
        JSON with alarm status, EC2 metrics, and risk assessment.
    """
    try:
        cw = get_cloudwatch_mcp()
        alarms = _run_async(cw.get_security_alarms())
        ec2 = _run_async(cw.get_ec2_security_metrics())
        # Check for errors in sub-results
        result = {"alarms": alarms, "ec2_security": ec2}
        for key, val in result.items():
            if isinstance(val, dict) and "error" in val:
                logger.warning(f"CloudWatch {key} returned error: {val['error']}")
        return json.dumps(result)
    except Exception as e:
        logger.error(f"CloudWatch security check tool failed: {e}")
        return json.dumps({"error": str(e), "alarms": {}, "ec2_security": {}, "source": "cloudwatch-mcp-server"})


@tool
def cloudwatch_billing_check(days_back: int = 7) -> str:
    """Check for billing anomalies using the CloudWatch MCP server.
    
    Monitors estimated charges for unusual cost increases
    that may indicate unauthorized resource usage.
    
    Args:
        days_back: Days to analyze
    
    Returns:
        JSON with billing metrics and anomaly detection.
    """
    try:
        cw = get_cloudwatch_mcp()
        result = _run_async(cw.get_billing_anomalies(days_back))
        if isinstance(result, dict) and result.get("error"):
            logger.warning(f"CloudWatch billing check returned error: {result['error']}")
            return json.dumps({"error": result["error"], "billing": result.get("billing", {}),
                              "_api_error": True, "message": f"CloudWatch API error: {result['error']}"})
        return json.dumps(result)
    except Exception as e:
        logger.error(f"CloudWatch billing check tool failed: {e}")
        return json.dumps({"error": str(e), "billing": {}, "source": "cloudwatch-mcp-server"})


@tool
def securityhub_get_findings(severity: Optional[str] = None, max_results: int = 50, days_back: Optional[int] = None) -> str:
    """Get Security Hub findings using the Security Hub MCP server.
    
    Pre-correlated, severity-scored findings from GuardDuty, Inspector, etc.
    Use when user asks about Security Hub, GuardDuty, Inspector, or pre-correlated findings.
    
    Args:
        severity: Filter — CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
        max_results: Maximum findings to return
        days_back: Only findings updated in last N days
    
    Returns:
        JSON with findings, severity summary, and risk indicators.
    """
    try:
        sh = get_security_hub_mcp()
        result = _run_async(sh.get_findings(severity=severity, max_results=max_results, days_back=days_back))
        if isinstance(result, dict) and result.get("error"):
            logger.warning(f"Security Hub returned error: {result['error']}")
            return json.dumps({"error": result["error"], "findings": result.get("findings", []),
                              "_api_error": True, "message": f"Security Hub API error: {result['error']}"})
        return json.dumps(result)
    except Exception as e:
        logger.error(f"Security Hub get_findings tool failed: {e}")
        return json.dumps({"error": str(e), "findings": [], "source": "securityhub-mcp-server"})


@tool
def nova_canvas_generate_report_cover(incident_type: str, severity: str = "CRITICAL", incident_id: str = "INC-000000") -> str:
    """Generate a visual security report cover using the Nova Canvas MCP server.
    
    Creates a professional incident report cover image using
    Amazon Nova Canvas (custom boto3, awslabs-inspired).
    
    Args:
        incident_type: Type of incident
        severity: Severity level
        incident_id: Incident identifier
    
    Returns:
        JSON with base64-encoded image and metadata.
    """
    try:
        nc = get_nova_canvas_mcp()
        result = _run_async(nc.generate_security_report_cover(incident_type, severity, incident_id))
        if isinstance(result, dict) and result.get("error"):
            logger.warning(f"Nova Canvas report cover returned error: {result['error']}")
            return json.dumps({"error": result["error"], "_api_error": True,
                              "message": f"Nova Canvas API error: {result['error']}"})
        return json.dumps(result)
    except Exception as e:
        logger.error(f"Nova Canvas report cover tool failed: {e}")
        return json.dumps({"error": str(e), "source": "nova-canvas-mcp-server"})


@tool
def ai_security_list_bedrock_models() -> str:
    """List Bedrock foundation models for AI-BOM inventory (AI Security MCP).
    
    Use when assessing AI security posture, building AI-BOM, or inventorying AI assets.
    
    Returns:
        JSON with models (modelId, modelName, provider, lifecycle).
    """
    try:
        ai = get_ai_security_mcp()
        result = _run_async(ai.list_bedrock_models())
        return json.dumps(result)
    except Exception as e:
        logger.warning(f"ai_security_list_bedrock_models failed: {e}")
        return json.dumps({"error": str(e), "models": [], "source": "ai-security-mcp"})


@tool
def ai_security_list_bedrock_agents() -> str:
    """List Bedrock agents for agentic AI threat assessment (AI Security MCP).
    
    Use when assessing agentic AI risks, excessive agency, or agent inventory.
    
    Returns:
        JSON with agents (agentId, agentName, agentStatus).
    """
    try:
        ai = get_ai_security_mcp()
        result = _run_async(ai.list_bedrock_agents())
        return json.dumps(result)
    except Exception as e:
        logger.warning(f"ai_security_list_bedrock_agents failed: {e}")
        return json.dumps({"error": str(e), "agents": [], "source": "ai-security-mcp"})


@tool
def ai_security_guardrail_recommendations() -> str:
    """Get guardrail configuration recommendations (AI Security MCP).
    
    Use when user asks about LLM guardrails, prompt injection protection, or securing AI.
    
    Returns:
        JSON with recommendations (e.g. Guardrail should protect against Prompt Injections).
    """
    try:
        ai = get_ai_security_mcp()
        result = _run_async(ai.get_guardrail_recommendations())
        return json.dumps(result)
    except Exception as e:
        logger.warning(f"ai_security_guardrail_recommendations failed: {e}")
        return json.dumps({"error": str(e), "recommendations": [], "source": "ai-security-mcp"})


@tool
def ai_security_owasp_llm_status() -> str:
    """Get OWASP LLM Security Top 10 compliance posture (AI Security MCP).
    
    Use when user asks about OWASP LLM, LLM security posture, or compliance status.
    
    Returns:
        JSON with categories (LLM01–LLM10), passed count, posture_percent.
    """
    try:
        ai = get_ai_security_mcp()
        result = _run_async(ai.get_owasp_llm_status())
        return json.dumps(result)
    except Exception as e:
        logger.warning(f"ai_security_owasp_llm_status failed: {e}")
        return json.dumps({"error": str(e), "categories": [], "source": "ai-security-mcp"})


@tool
def query_incident_history(account_id: str = "demo-account", limit: int = 5) -> str:
    """Query recent incidents from cross-incident memory (DynamoDB).
    
    Use this to check if similar incidents occurred before, for campaign correlation.
    
    Args:
        account_id: AWS account ID or logical account identifier
        limit: Maximum number of recent incidents to return (default 5)
    
    Returns:
        JSON with recent incidents: incident_id, timestamp, severity, attack_type, mitre_techniques.
    """
    try:
        memory = get_incident_memory()
        incidents = _run_async(memory.get_recent_incidents(account_id=account_id, limit=limit))
        return json.dumps({"incidents": incidents, "account_id": account_id})
    except Exception as e:
        logger.warning(f"query_incident_history failed: {e}")
        return json.dumps({"error": str(e), "incidents": [], "account_id": account_id})


@tool
def get_security_playbook(query: str) -> str:
    """Retrieve security playbooks and best practices from the Knowledge Base (RAG).
    
    Use when the user asks about incident response procedures, remediation steps,
    AWS security best practices, MITRE ATT&CK mappings, or "how do I respond to X".
    Only available when KNOWLEDGE_BASE_ID is configured (optional Terraform + console setup).
    
    Args:
        query: Natural language question (e.g. "How to respond to cryptomining?",
               "IAM privilege escalation remediation", "Data exfiltration playbook")
    
    Returns:
        Answer with citations to playbook sources, or message if KB not configured.
    """
    try:
        result = _run_async(kb_retrieve_and_generate(query))
        answer = result.get("answer", "")
        citations = result.get("citations", [])
        if citations:
            answer += "\n\nSources: " + "; ".join(citations[:3])
        return answer
    except Exception as e:
        logger.warning(f"get_security_playbook failed: {e}")
        return f"Playbook retrieval failed: {e}. Ensure KNOWLEDGE_BASE_ID is set and KB is synced."


# ========== ALL STRANDS TOOLS ==========
STRANDS_TOOLS = [
    # Core Nova agent tools
    analyze_security_timeline,
    score_event_risk,
    generate_remediation,
    generate_incident_documentation,
    query_security_incident,
    query_incident_history,
    get_security_playbook,
    # AWS MCP server tools
    cloudtrail_lookup,
    cloudtrail_anomaly_scan,
    iam_audit,
    iam_policy_analysis,
    cloudwatch_security_check,
    cloudwatch_billing_check,
    securityhub_get_findings,
    nova_canvas_generate_report_cover,
    # AI Security MCP
    ai_security_list_bedrock_models,
    ai_security_list_bedrock_agents,
    ai_security_guardrail_recommendations,
    ai_security_owasp_llm_status,
]


# ========== STRANDS AGENT ==========

SYSTEM_PROMPT = """You are wolfir's security orchestrator, powered by Amazon Nova 2 Lite
and coordinating multiple AWS MCP servers through the Strands Agents SDK.

You have access to these tool categories:

CORE ANALYSIS (Nova AI Models):
1. analyze_security_timeline — Build attack timeline from CloudTrail events (Nova 2 Lite)
2. score_event_risk — Fast risk scoring per event (Nova Micro)
3. generate_remediation — Step-by-step remediation plans (Nova 2 Lite)
4. generate_incident_documentation — JIRA/Slack/Confluence docs (Nova 2 Lite)
5. query_security_incident — Answer questions about incidents (Nova 2 Lite)
6. query_incident_history — Query past incidents from cross-incident memory (campaign correlation)
7. get_security_playbook — Retrieve incident response playbooks from Knowledge Base (optional RAG)

AWS MCP SERVER TOOLS:
8. cloudtrail_lookup — Lookup CloudTrail events by category (cloudtrail-mcp-server)
9. cloudtrail_anomaly_scan — Scan for security anomalies (cloudtrail-mcp-server)
10. iam_audit — Audit IAM users/roles for issues (iam-mcp-server)
11. iam_policy_analysis — Analyze specific IAM policies (iam-mcp-server)
12. cloudwatch_security_check — Monitor security alarms and EC2 metrics (cloudwatch-mcp-server)
13. cloudwatch_billing_check — Detect billing anomalies (cloudwatch-mcp-server)
14. securityhub_get_findings — Get pre-correlated Security Hub findings (GuardDuty, Inspector)
15. nova_canvas_generate_report_cover — Generate visual report covers (nova-canvas-mcp-server)
16. ai_security_list_bedrock_models — List Bedrock models for AI-BOM (ai-security-mcp)
17. ai_security_list_bedrock_agents — List Bedrock agents for agentic AI assessment (ai-security-mcp)
18. ai_security_guardrail_recommendations — Guardrail recommendations for LLM security (ai-security-mcp)
19. ai_security_owasp_llm_status — OWASP LLM Top 10 compliance posture (ai-security-mcp)

When analyzing an incident:
- Start with cloudtrail_lookup or analyze_security_timeline to understand the attack
- Use iam_audit to check for IAM-related vulnerabilities
- Score individual high-risk events with score_event_risk
- Check cloudwatch_security_check for monitoring gaps
- Generate remediation based on findings
- Create documentation for the incident response team
- Use securityhub_get_findings for pre-correlated GuardDuty/Inspector findings
- Use nova_canvas_generate_report_cover for visual reports
- Use get_security_playbook for incident response procedures and AWS best practices (when KB configured)
- Use ai_security_* tools when the user asks about AI security, Bedrock models, guardrails, or agentic AI threats

Be concise, actionable, and security-focused in your responses."""


def create_strands_agent() -> Agent:
    """Create a Strands Agent with all security tools registered."""
    settings = get_settings()
    # Use inference profile ID (e.g. us.amazon.nova-2-lite-v1:0) — direct model ID no longer supports on-demand
    model_id = settings.nova_lite_model_id
    return Agent(
        model=model_id,
        tools=STRANDS_TOOLS,
        system_prompt=SYSTEM_PROMPT,
    )


# ========== ORCHESTRATOR CLASS ==========
# Wraps the Strands Agent for integration with our FastAPI backend.

class StrandsOrchestrator:
    """
    Production orchestrator using the real Strands Agents SDK.
    
    Provides two modes:
    1. Pipeline mode — deterministic tool execution for the demo
    2. Agent mode — let the Strands Agent plan and execute autonomously
    
    Integrates AWS MCP server tools alongside core Nova agent tools.
    """
    
    def __init__(self):
        self.execution_history: List[Dict[str, Any]] = []
        self._agent = None
        logger.info(f"StrandsOrchestrator initialized with {len(STRANDS_TOOLS)} Strands tools "
                     f"(6 core Nova + 8 AWS MCP + 3 AI Security MCP)")
    
    @property
    def agent(self) -> Agent:
        """Lazy-initialize the Strands Agent."""
        if self._agent is None:
            self._agent = create_strands_agent()
            logger.info("Strands Agent created with tools: " + 
                        ", ".join(t.tool_name if hasattr(t, 'tool_name') else t.__name__ for t in STRANDS_TOOLS))
        return self._agent
    
    async def plan_and_execute(
        self,
        events: List[Dict[str, Any]],
        diagram_data: Optional[bytes] = None,
        incident_type: Optional[str] = None,
        voice_query: Optional[str] = None,
        account_id: str = "demo-account",
    ) -> Dict[str, Any]:
        """
        Execute deterministic pipeline using Strands tools.
        
        Calls each tool directly in dependency order for predictable demo behavior.
        Uses the same @tool-decorated functions that the Strands Agent would use.
        Integrates incident memory: correlates at start (post-timeline), saves at end.
        """
        incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        start_time = time.time()
        correlation_result = None
        
        logger.info(f"[{incident_id}] Strands pipeline: starting deterministic execution (account={account_id})")
        
        state = {
            "incident_id": incident_id,
            "status": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
            "tools": {},
            "results": {},
        }
        
        # Step 1: Temporal Analysis (Nova 2 Lite)
        logger.info(f"[{incident_id}] Step 1: analyze_security_timeline")
        state["tools"]["temporal"] = {"status": "RUNNING", "model": "amazon.nova-2-lite-v1:0"}
        agent_pivot = None
        try:
            timeline_json = await asyncio.to_thread(
                analyze_security_timeline,
                events_json=json.dumps(events, default=str),
                incident_type=incident_type or "Unknown"
            )
            timeline = json.loads(timeline_json)
            state["tools"]["temporal"]["status"] = "COMPLETED"
            state["results"]["timeline"] = timeline

            # AGENTIC PIVOT: If timeline confidence < 0.3, run anomaly scan before proceeding
            # Demonstrates conditional reasoning — agent adapts when initial analysis is uncertain
            confidence = float(timeline.get("confidence", 0.5))
            if confidence < 0.3:
                logger.info(f"[{incident_id}] Agent pivot: timeline confidence {confidence} < 0.3 → running cloudtrail_anomaly_scan")
                agent_pivot = "Timeline confidence low (<0.3) — ran CloudTrail anomaly scan for additional signal before proceeding"
                state["tools"]["anomaly_scan"] = {"status": "RUNNING", "reason": "low_confidence_pivot"}
                try:
                    anomaly_result = await asyncio.to_thread(cloudtrail_anomaly_scan, days_back=1)
                    state["tools"]["anomaly_scan"]["status"] = "COMPLETED"
                    state["results"]["anomaly_scan"] = json.loads(anomaly_result) if isinstance(anomaly_result, str) else anomaly_result
                except Exception as ae:
                    logger.warning(f"[{incident_id}] Anomaly scan failed: {ae}")
                    state["tools"]["anomaly_scan"] = {"status": "FAILED", "error": str(ae)}
        except Exception as e:
            logger.error(f"[{incident_id}] Timeline failed: {e}")
            state["tools"]["temporal"] = {"status": "FAILED", "error": str(e)}

        # Empty events pivot: CloudTrail returned no events → try anomaly scan for alternative signal
        if len(events) == 0 and not agent_pivot:
            logger.info(f"[{incident_id}] Agent pivot: no events from CloudTrail → running cloudtrail_anomaly_scan")
            agent_pivot = "CloudTrail returned no events — ran anomaly scan for alternative signal"
            state["tools"]["anomaly_scan"] = {"status": "RUNNING", "reason": "empty_events_pivot"}
            try:
                anomaly_result = await asyncio.to_thread(cloudtrail_anomaly_scan, days_back=1)
                state["tools"]["anomaly_scan"]["status"] = "COMPLETED"
                state["results"]["anomaly_scan"] = json.loads(anomaly_result) if isinstance(anomaly_result, str) else anomaly_result
            except Exception as ae:
                logger.warning(f"[{incident_id}] Anomaly scan failed: {ae}")
                state["tools"]["anomaly_scan"] = {"status": "FAILED", "error": str(ae)}
        
        # Correlation: query incident memory for past similar incidents
        try:
            memory = get_incident_memory()
            partial_incident = {"incident_id": incident_id, "results": state["results"], "metadata": {"incident_type": incident_type}, "timeline": state["results"].get("timeline")}
            correlation_result = await memory.correlate_incident(partial_incident, account_id=account_id)
            state["results"]["correlation"] = {
                "correlation_summary": correlation_result.correlation_summary,
                "campaign_probability": correlation_result.campaign_probability,
                "pattern_matches": len(correlation_result.pattern_matches),
                "technique_overlaps": len(correlation_result.technique_overlaps),
            }
        except Exception as e:
            logger.warning(f"[{incident_id}] Correlation failed: {e}")
        
        # Step 2: Risk Scoring (Nova Micro) — parallel for speed
        logger.info(f"[{incident_id}] Step 2: score_event_risk (parallel)")
        state["tools"]["risk_scorer"] = {"status": "RUNNING", "model": "amazon.nova-micro-v1:0"}
        try:
            critical_events = events[:5] if len(events) > 5 else events
            tasks = [asyncio.to_thread(score_event_risk, event_json=json.dumps(e, default=str)) for e in critical_events]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            risk_scores = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.warning(f"Risk scoring failed: {result}")
                else:
                    risk_scores.append({
                        "event": critical_events[i].get("eventName", critical_events[i].get("event_name", "Unknown")),
                        "risk": json.loads(result) if isinstance(result, str) else result,
                    })
            state["tools"]["risk_scorer"]["status"] = "COMPLETED"
            state["results"]["risk_scores"] = risk_scores
        except Exception as e:
            logger.error(f"[{incident_id}] Risk scoring failed: {e}")
            state["tools"]["risk_scorer"] = {"status": "FAILED", "error": str(e)}
        
        # Step 3 & 4: Remediation + Documentation in parallel (both need timeline only)
        if state["results"].get("timeline"):
            tl = state["results"]["timeline"]
            state["tools"]["remediation"] = {"status": "RUNNING", "model": "amazon.nova-2-lite-v1:0"}
            state["tools"]["documentation"] = {"status": "RUNNING", "model": "amazon.nova-2-lite-v1:0"}
            logger.info(f"[{incident_id}] Step 3+4: generate_remediation + generate_incident_documentation (parallel)")

            async def run_remediation():
                return await asyncio.to_thread(
                    generate_remediation,
                    root_cause=tl.get("root_cause", "Unknown"),
                    attack_pattern=tl.get("attack_pattern", "Unknown"),
                    blast_radius=tl.get("blast_radius", "Unknown"),
                    timeline_events_json=json.dumps(tl.get("events", []), default=str)
                )

            async def run_documentation(remediation_json_str: str):
                return await asyncio.to_thread(
                    generate_incident_documentation,
                    incident_id=incident_id,
                    timeline_json=json.dumps(tl, default=str),
                    remediation_json=remediation_json_str
                )

            try:
                rem_result, docs_result = await asyncio.gather(
                    run_remediation(),
                    run_documentation("{}"),  # Docs with empty remediation (parallel speed gain)
                    return_exceptions=True
                )
                if isinstance(rem_result, Exception):
                    logger.error(f"[{incident_id}] Remediation failed: {rem_result}")
                    state["tools"]["remediation"] = {"status": "FAILED", "error": str(rem_result)}
                else:
                    state["tools"]["remediation"]["status"] = "COMPLETED"
                    state["results"]["remediation_plan"] = json.loads(rem_result)
                if isinstance(docs_result, Exception):
                    logger.error(f"[{incident_id}] Documentation failed: {docs_result}")
                    state["tools"]["documentation"] = {"status": "FAILED", "error": str(docs_result)}
                else:
                    state["tools"]["documentation"]["status"] = "COMPLETED"
                    state["results"]["documentation"] = json.loads(docs_result)
            except Exception as e:
                logger.error(f"[{incident_id}] Remediation or Documentation failed: {e}")
                state["tools"]["remediation"]["status"] = "FAILED"
                state["tools"]["documentation"]["status"] = "FAILED"
        
        # Finalize
        total_time = int((time.time() - start_time) * 1000)
        
        self.execution_history.append({
            "incident_id": incident_id,
            "tools_executed": list(state["tools"].keys()),
            "timestamp": datetime.utcnow().isoformat(),
            "total_time_ms": total_time,
        })
        
        logger.info(f"[{incident_id}] Strands pipeline complete in {total_time}ms")
        
        # Save incident to memory for future correlation
        try:
            memory = get_incident_memory()
            incident_data = {
                "incident_id": incident_id,
                "results": state["results"],
                "metadata": {"incident_type": incident_type},
                "timeline": state["results"].get("timeline"),
            }
            await memory.save_incident(incident_data, account_id=account_id)
        except Exception as e:
            logger.warning(f"[{incident_id}] Failed to save incident to memory: {e}")
        
        metadata = {
            "incident_type": incident_type,
            "account_id": account_id,
            "tools_used": list(state["tools"].keys()),
            "framework": "strands-agents",
            "mcp_servers": [
                "cloudtrail-mcp-server",
                "iam-mcp-server",
                "cloudwatch-mcp-server",
                "securityhub-mcp-server",
                "nova-canvas-mcp-server",
            ],
            "sdk_version": "real",
        }
        if agent_pivot:
            metadata["agent_pivot"] = agent_pivot

        return {
            "incident_id": incident_id,
            "status": "completed",
            "analysis_time_ms": total_time,
            "agents": state["tools"],
            "results": state["results"],
            "model_used": "strands-agents-orchestration",
            "metadata": metadata,
        }
    
    async def agent_query(
        self,
        prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Use the Strands Agent for interactive queries.
        
        The Agent autonomously decides which tools to call based on the prompt.
        Supports multi-turn conversation: pass prior exchanges so the agent
        can answer follow-ups like "Fix the first issue" or "What MITRE techniques?"
        """
        effective_prompt = prompt
        history = conversation_history or []
        if history:
            context_parts = []
            for msg in history[-10:]:  # Last 10 messages (5 exchanges)
                role = msg.get("role", "user")
                content = (msg.get("content") or "").strip()
                if not content:
                    continue
                label = "User" if role == "user" else "Assistant"
                context_parts.append(f"{label}: {content}")
            if context_parts:
                effective_prompt = (
                    "Previous conversation:\n"
                    + "\n\n".join(context_parts)
                    + "\n\nCurrent user query: "
                    + prompt
                )
        try:
            # Run the Strands Agent in a thread (it's synchronous).
            # Timeout prevents runaway tool loops (Strands has no max_turns param).
            AGENT_QUERY_TIMEOUT_SEC = 120
            result = await asyncio.wait_for(
                asyncio.to_thread(self.agent, effective_prompt),
                timeout=AGENT_QUERY_TIMEOUT_SEC,
            )
            return str(result)
        except asyncio.TimeoutError:
            logger.warning(f"Agent query timed out after {AGENT_QUERY_TIMEOUT_SEC}s")
            return (
                "The agent took too long to respond. Try a simpler query or narrow the scope. "
                "You can also use the pipeline analysis for structured incident analysis."
            )
        except Exception as e:
            logger.error(f"Strands agent query failed: {e}")
            return f"Agent error: {str(e)}"
    
    def get_registered_tools(self) -> List[Dict[str, Any]]:
        """Get all registered Strands tools with their schemas."""
        tools_info = []
        for t in STRANDS_TOOLS:
            name = t.tool_name if hasattr(t, 'tool_name') else t.__name__
            doc = t.__doc__ or ""
            # Determine source
            if name.startswith("cloudtrail_"):
                source = "cloudtrail-mcp-server"
            elif name.startswith("iam_"):
                source = "iam-mcp-server"
            elif name.startswith("cloudwatch_"):
                source = "cloudwatch-mcp-server"
            elif name.startswith("nova_canvas_"):
                source = "nova-canvas-mcp-server"
            else:
                source = "nova-agent"
            
            tools_info.append({
                "name": name,
                "description": doc.strip().split("\n")[0] if doc else "",
                "framework": "strands-agents",
                "source": source,
            })
        return tools_info
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get execution history."""
        return self.execution_history
