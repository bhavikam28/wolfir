"""
Nova Sentinel MCP Server
Standards-compliant Model Context Protocol server using the real mcp package.

Uses FastMCP from the official mcp Python SDK to expose security analysis tools
as MCP-compatible services that any MCP client can discover and invoke.

Custom MCP implementations inspired by awslabs/mcp patterns (direct boto3 API calls):
- CloudTrail MCP — event lookup, security scanning, anomaly detection
- IAM MCP — user/role auditing, policy analysis, access review
- CloudWatch MCP — security alarms, metric monitoring, billing anomalies
- Nova Canvas MCP — visual report generation

pip install mcp

Run standalone: python mcp_server.py
Or mount the SSE app into FastAPI for web access.
"""
import json
import asyncio
from typing import Dict, Any, List, Optional

from mcp.server.fastmcp import FastMCP

from agents.temporal_agent import TemporalAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.voice_agent import VoiceAgent
from agents.documentation_agent import DocumentationAgent
from mcp_servers.cloudtrail_mcp import get_cloudtrail_mcp
from mcp_servers.iam_mcp import get_iam_mcp
from mcp_servers.cloudwatch_mcp import get_cloudwatch_mcp
from mcp_servers.nova_canvas_mcp import get_nova_canvas_mcp
from utils.logger import logger
from utils.mock_data import generate_crypto_mining_scenario, generate_data_exfiltration_scenario


# ========== CREATE MCP SERVER ==========
# Using the official MCP Python SDK (mcp>=1.11.0)

mcp_server = FastMCP(
    "nova-sentinel-security",
    instructions=(
        "Nova Sentinel — AI-powered AWS security analysis via Model Context Protocol. "
        "Orchestrates 5 AWS MCP servers (CloudTrail, IAM, CloudWatch, Nova Canvas, "
        "Well-Architected Security) through Strands Agents SDK. "
        "Exposes CloudTrail analysis, IAM auditing, risk scoring, remediation planning, "
        "visual report generation, and documentation tools."
    ),
)

# ========== LAZY AGENT INITIALIZATION ==========

_agents = {}

def _get_agent(name: str):
    """Lazy-initialize agents to avoid startup overhead."""
    if name not in _agents:
        if name == "temporal":
            _agents[name] = TemporalAgent()
        elif name == "risk_scorer":
            _agents[name] = RiskScorerAgent()
        elif name == "remediation":
            _agents[name] = RemediationAgent()
        elif name == "voice":
            _agents[name] = VoiceAgent()
        elif name == "documentation":
            _agents[name] = DocumentationAgent()
    return _agents[name]


# ================================================================
# CORE SECURITY ANALYSIS TOOLS
# ================================================================

@mcp_server.tool()
async def analyze_security_events(events: list, incident_type: str = "Unknown") -> dict:
    """Analyze CloudTrail security events to build an attack timeline.
    
    Uses Nova 2 Lite for temporal reasoning. Identifies root cause,
    attack pattern, blast radius, and builds an ordered event timeline
    with severity classifications.
    
    Args:
        events: List of CloudTrail event objects to analyze
        incident_type: Type of incident (e.g., crypto-mining, data-exfiltration)
    """
    agent = _get_agent("temporal")
    result = await agent.analyze_timeline(events=events, incident_type=incident_type)
    return result.dict() if hasattr(result, 'dict') else result


@mcp_server.tool()
async def score_event_risk(event: dict) -> dict:
    """Score the risk level of a single CloudTrail event.
    
    Uses Nova Micro for ultra-fast (<1s) classification. Returns severity,
    confidence, risk score, and MITRE ATT&CK technique mapping.
    
    Args:
        event: A single CloudTrail event object to score
    """
    agent = _get_agent("risk_scorer")
    return await agent.score_event_risk(event)


@mcp_server.tool()
async def generate_remediation_plan(
    root_cause: str,
    attack_pattern: str,
    blast_radius: str = "Unknown",
    timeline_events: list = []
) -> dict:
    """Generate a step-by-step remediation plan for a security incident.
    
    Creates actionable steps with AWS CLI commands, IAM policy fixes,
    security group changes, and compliance-aligned recommendations.
    
    Args:
        root_cause: Root cause of the incident
        attack_pattern: Identified attack pattern
        blast_radius: Scope of impact
        timeline_events: Timeline events from analysis
    """
    agent = _get_agent("remediation")
    return await agent.generate_remediation_plan(
        incident_analysis={"timeline": {}},
        root_cause=root_cause,
        attack_pattern=attack_pattern,
        blast_radius=blast_radius,
        timeline_events=timeline_events
    )


@mcp_server.tool()
async def query_incident(query: str, incident_context: dict = {}) -> dict:
    """Ask a natural language question about a security incident.
    
    Processes conversational queries about attack patterns, timelines,
    remediation steps, compliance impacts, and cost estimates.
    
    Args:
        query: Natural language question about the incident
        incident_context: Current incident data for context
    """
    agent = _get_agent("voice")
    return await agent.process_voice_query(
        query_text=query,
        incident_context=incident_context if incident_context else None
    )


@mcp_server.tool()
async def generate_documentation(
    incident_id: str,
    timeline: dict,
    remediation_plan: dict = {}
) -> dict:
    """Generate incident documentation for JIRA, Slack, and Confluence.
    
    Creates structured, platform-ready documentation including JIRA tickets,
    Slack notifications, and Confluence post-mortem pages.
    
    Args:
        incident_id: Incident identifier
        timeline: Analysis timeline data
        remediation_plan: Generated remediation plan
    """
    agent = _get_agent("documentation")
    return await agent.generate_documentation(
        incident_id=incident_id,
        incident_analysis={"timeline": timeline},
        timeline=timeline,
        remediation_plan=remediation_plan if remediation_plan else None
    )


# ================================================================
# CLOUDTRAIL MCP SERVER TOOLS
# Custom implementation inspired by awslabs/mcp patterns (boto3)
# ================================================================

@mcp_server.tool()
async def cloudtrail_lookup_events(
    event_category: str = "all",
    days_back: int = 7,
    max_results: int = 50
) -> dict:
    """Lookup CloudTrail events with security-focused filtering.
    
    Custom CloudTrail MCP (boto3). Filters events by category
    (iam, network, data, compute) and classifies severity.
    
    Args:
        event_category: Filter — "iam", "network", "data", "compute", or "all"
        days_back: Number of days to look back
        max_results: Maximum events to return
    """
    ct = get_cloudtrail_mcp()
    return await ct.lookup_security_events(event_category, days_back, max_results)


@mcp_server.tool()
async def cloudtrail_get_trail_status() -> dict:
    """Get status of CloudTrail trails in the AWS account.
    
    Checks if logging is active, validates configuration,
    and reports trail health for security compliance.
    """
    ct = get_cloudtrail_mcp()
    return await ct.get_trail_status()


@mcp_server.tool()
async def cloudtrail_scan_anomalies(days_back: int = 1, max_results: int = 100) -> dict:
    """Scan recent CloudTrail events for security anomalies.
    
    Detects root account usage, console logins without MFA,
    access key creation, security group changes, S3 policy modifications,
    and CloudTrail evasion attempts.
    
    Args:
        days_back: How many days to scan
        max_results: Maximum anomalies to return
    """
    ct = get_cloudtrail_mcp()
    return await ct.scan_for_anomalies(days_back, max_results)


# ================================================================
# IAM MCP SERVER TOOLS
# Custom implementation inspired by awslabs/mcp (boto3)
# ================================================================

@mcp_server.tool()
async def iam_audit_users() -> dict:
    """Audit all IAM users for security issues.
    
    Custom IAM MCP (boto3). Checks MFA compliance,
    access key rotation, admin access policies, and unused credentials.
    Returns per-user risk scoring and remediation commands.
    """
    iam = get_iam_mcp()
    return await iam.audit_iam_users()


@mcp_server.tool()
async def iam_audit_roles() -> dict:
    """Audit IAM roles for security issues.
    
    Checks trust policies for wildcard principals, cross-account trust,
    admin access roles, and overly permissive configurations.
    """
    iam = get_iam_mcp()
    return await iam.audit_iam_roles()


@mcp_server.tool()
async def iam_analyze_policy(policy_arn: str) -> dict:
    """Deep-analyze a specific IAM policy for security issues.
    
    Examines policy statements for wildcard actions, wildcard resources,
    overly broad permissions, and compliance violations.
    
    Args:
        policy_arn: ARN of the IAM policy to analyze
    """
    iam = get_iam_mcp()
    return await iam.analyze_policy(policy_arn)


@mcp_server.tool()
async def iam_account_summary() -> dict:
    """Get IAM account summary with security metrics.
    
    Returns account-level IAM statistics including user/role/policy counts,
    MFA device usage, root account MFA status, and compliance issues.
    """
    iam = get_iam_mcp()
    return await iam.get_account_summary()


# ================================================================
# CLOUDWATCH MCP SERVER TOOLS
# Custom implementation inspired by awslabs/mcp (boto3)
# ================================================================

@mcp_server.tool()
async def cloudwatch_security_alarms() -> dict:
    """Get CloudWatch alarms related to security.
    
    Custom CloudWatch MCP (boto3). Lists all alarms,
    identifies security-related ones, and highlights active alerts.
    """
    cw = get_cloudwatch_mcp()
    return await cw.get_security_alarms()


@mcp_server.tool()
async def cloudwatch_api_metrics(hours_back: int = 24) -> dict:
    """Get API call volume metrics for anomaly detection.
    
    Monitors CloudTrail event volumes over time to detect
    unusual spikes in API activity that could indicate an attack.
    
    Args:
        hours_back: Number of hours to analyze
    """
    cw = get_cloudwatch_mcp()
    return await cw.get_api_call_metrics(hours_back)


@mcp_server.tool()
async def cloudwatch_ec2_security(hours_back: int = 6) -> dict:
    """Get EC2 security metrics for crypto-mining and data exfiltration detection.
    
    Monitors CPU utilization spikes and network throughput anomalies
    across EC2 instances to detect crypto-mining or data exfiltration.
    
    Args:
        hours_back: Number of hours to analyze
    """
    cw = get_cloudwatch_mcp()
    return await cw.get_ec2_security_metrics(hours_back)


@mcp_server.tool()
async def cloudwatch_billing_anomalies(days_back: int = 7) -> dict:
    """Check for billing anomalies that could indicate security incidents.
    
    Monitors estimated charges for unusual cost increases that may signal
    unauthorized resource usage (crypto-mining, data transfer, etc.).
    
    Args:
        days_back: Number of days to analyze
    """
    cw = get_cloudwatch_mcp()
    return await cw.get_billing_anomalies(days_back)


# ================================================================
# NOVA CANVAS MCP SERVER TOOLS
# Custom implementation inspired by awslabs/mcp (boto3)
# ================================================================

@mcp_server.tool()
async def nova_canvas_generate_image(
    prompt: str,
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    quality: str = "standard",
    cfg_scale: float = 8.0,
    seed: int = 0,
    num_images: int = 1,
) -> dict:
    """Generate an image using Amazon Nova Canvas.
    
    Custom Nova Canvas MCP (boto3).
    Creates images from text prompts with customizable dimensions,
    quality options, and negative prompting.
    
    Args:
        prompt: Text description of the image to generate
        negative_prompt: What NOT to include
        width: Image width (320-4096px)
        height: Image height (320-4096px)
        quality: "standard" or "premium"
        cfg_scale: Prompt adherence (1.1-10.0)
        seed: Seed for reproducible generation (0 for random)
        num_images: Number of images (1-5)
    """
    nc = get_nova_canvas_mcp()
    return await nc.generate_image(
        prompt=prompt,
        negative_prompt=negative_prompt,
        width=width, height=height,
        quality=quality,
        cfg_scale=cfg_scale,
        seed=seed,
        num_images=num_images,
    )


@mcp_server.tool()
async def nova_canvas_generate_with_colors(
    prompt: str,
    colors: list,
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    quality: str = "standard",
    cfg_scale: float = 8.0,
) -> dict:
    """Generate an image with specific color palette guidance.
    
    Custom Nova Canvas MCP (boto3).
    Define up to 10 hex color values to influence the image style.
    
    Args:
        prompt: Text description of the image
        colors: List of hex color values (e.g., ["#4F46E5", "#10B981"])
        negative_prompt: What NOT to include
        width: Image width (320-4096px)
        height: Image height (320-4096px)
        quality: "standard" or "premium"
        cfg_scale: Prompt adherence (1.1-10.0)
    """
    nc = get_nova_canvas_mcp()
    return await nc.generate_image_with_colors(
        prompt=prompt, colors=colors,
        negative_prompt=negative_prompt,
        width=width, height=height,
        quality=quality, cfg_scale=cfg_scale,
    )


@mcp_server.tool()
async def nova_canvas_security_report_cover(
    incident_type: str,
    severity: str = "CRITICAL",
    incident_id: str = "INC-000000",
) -> dict:
    """Generate a professional security incident report cover image.
    
    Uses Nova Canvas to create visually compelling covers for
    PDF exports and incident documentation.
    
    Args:
        incident_type: Type of incident
        severity: Severity level (CRITICAL, HIGH, MEDIUM, LOW)
        incident_id: Incident identifier
    """
    nc = get_nova_canvas_mcp()
    return await nc.generate_security_report_cover(incident_type, severity, incident_id)


@mcp_server.tool()
async def nova_canvas_attack_path_visual(
    attack_stages: list,
    severity: str = "CRITICAL",
) -> dict:
    """Generate a visual attack path diagram using Nova Canvas.
    
    Creates a MITRE ATT&CK style kill chain visualization
    showing the progression of an attack through stages.
    
    Args:
        attack_stages: List of attack stages
        severity: Overall severity level
    """
    nc = get_nova_canvas_mcp()
    return await nc.generate_attack_path_visual(attack_stages, severity)


# ================================================================
# DEMO TOOLS
# ================================================================

@mcp_server.tool()
async def list_demo_scenarios() -> dict:
    """List available demo security scenarios for testing.
    
    Returns pre-built CloudTrail event scenarios that demonstrate
    different attack types for evaluation and testing purposes.
    """
    return {
        "scenarios": [
            {
                "id": "crypto-mining",
                "name": "Crypto Mining Attack",
                "severity": "CRITICAL",
                "description": "Unauthorized EC2 instances running cryptocurrency miners"
            },
            {
                "id": "data-exfiltration",
                "name": "Data Exfiltration via S3",
                "severity": "CRITICAL",
                "description": "Sensitive data being exfiltrated through S3 bucket manipulation"
            },
        ]
    }


@mcp_server.tool()
async def get_demo_events(scenario: str) -> dict:
    """Get CloudTrail events for a specific demo scenario.
    
    Returns realistic CloudTrail events that simulate the specified
    attack scenario for demonstration and testing purposes.
    
    Args:
        scenario: Demo scenario name (crypto-mining, data-exfiltration)
    """
    if scenario == "crypto-mining":
        events = generate_crypto_mining_scenario()
    elif scenario == "data-exfiltration":
        events = generate_data_exfiltration_scenario()
    else:
        events = generate_crypto_mining_scenario()
    
    return {"scenario": scenario, "events": events}


# ========== MCP RESOURCES ==========

@mcp_server.resource("nova-sentinel://models")
async def get_models() -> str:
    """List all Nova AI models used by Nova Sentinel."""
    models = {
        "models": [
            {"id": "amazon.nova-2-lite-v1:0", "name": "Nova 2 Lite", "role": "Temporal Analysis, Documentation, Remediation"},
            {"id": "amazon.nova-pro-v1:0", "name": "Nova Pro", "role": "Multimodal Visual Analysis"},
            {"id": "amazon.nova-micro-v1:0", "name": "Nova Micro", "role": "Fast Risk Classification"},
            {"id": "amazon.nova-2-sonic-v1:0", "name": "Nova 2 Sonic", "role": "Voice Interaction"},
            {"id": "amazon.nova-canvas-v1:0", "name": "Nova Canvas", "role": "Visual Report Generation"},
        ]
    }
    return json.dumps(models, indent=2)


@mcp_server.resource("nova-sentinel://architecture")
async def get_architecture() -> str:
    """Describe Nova Sentinel's multi-agent architecture."""
    arch = {
        "name": "Nova Sentinel",
        "framework": "Strands Agents SDK + MCP Server (FastMCP)",
        "mcp_servers": [
            "cloudtrail-mcp-server — CloudTrail event lookup, security scanning, anomaly detection",
            "iam-mcp-server — IAM user/role auditing, policy analysis, MFA compliance",
            "cloudwatch-mcp-server — Security alarms, API metrics, billing anomalies",
            "nova-canvas-mcp-server — Visual report generation using Amazon Nova Canvas",
        ],
        "pipeline": [
            "1. DETECT — cloudtrail-mcp-server + cloudwatch-mcp-server + Nova 2 Lite temporal analysis",
            "2. INVESTIGATE — iam-mcp-server + Nova Pro multimodal architecture analysis",
            "3. CLASSIFY — Nova Micro fast risk scoring (<1s per event)",
            "4. REMEDIATE — iam-mcp-server + Nova 2 Lite remediation plans + Nova Act browser automation",
            "5. VISUALIZE — nova-canvas-mcp-server + aws-diagram-mcp-server",
            "6. DOCUMENT — Nova 2 Lite JIRA/Slack/Confluence documentation",
        ],
        "total_mcp_tools": 22,
    }
    return json.dumps(arch, indent=2)


@mcp_server.resource("nova-sentinel://mcp-servers")
async def get_mcp_servers() -> str:
    """List all AWS MCP servers integrated into Nova Sentinel."""
    servers = {
        "mcp_servers": [
            {
                "name": "cloudtrail-mcp-server",
                "source": "custom (awslabs-inspired)",
                "tools": ["cloudtrail_lookup_events", "cloudtrail_get_trail_status", "cloudtrail_scan_anomalies"],
                "description": "CloudTrail event analysis and anomaly detection",
            },
            {
                "name": "iam-mcp-server",
                "source": "custom (awslabs-inspired)",
                "tools": ["iam_audit_users", "iam_audit_roles", "iam_analyze_policy", "iam_account_summary"],
                "description": "IAM security auditing and policy analysis",
            },
            {
                "name": "cloudwatch-mcp-server",
                "source": "custom (awslabs-inspired)",
                "tools": ["cloudwatch_security_alarms", "cloudwatch_api_metrics", "cloudwatch_ec2_security", "cloudwatch_billing_anomalies"],
                "description": "Security monitoring, metrics, and billing anomaly detection",
            },
            {
                "name": "nova-canvas-mcp-server",
                "source": "custom (awslabs-inspired)",
                "tools": ["nova_canvas_generate_image", "nova_canvas_generate_with_colors", "nova_canvas_security_report_cover", "nova_canvas_attack_path_visual"],
                "description": "Visual report generation using Amazon Nova Canvas",
            },
        ]
    }
    return json.dumps(servers, indent=2)


# ========== SERVER INFO (for REST API compatibility) ==========

MCP_SERVER_INFO = {
    "name": "nova-sentinel-mcp",
    "version": "3.0.0",
    "description": "Nova Sentinel Security Analysis MCP Server — Multi-MCP Orchestration Platform",
    "sdk": "mcp>=1.11.0 (FastMCP)",
    "capabilities": {
        "tools": True,
        "resources": True,
    },
    "mcp_servers_integrated": [
        "cloudtrail-mcp-server (custom boto3)",
            "iam-mcp-server (custom boto3)",
            "cloudwatch-mcp-server (custom boto3)",
            "nova-canvas-mcp-server (custom boto3)",
    ],
    "models_used": [
        "amazon.nova-2-lite-v1:0 (Temporal Analysis, Documentation)",
        "amazon.nova-pro-v1:0 (Visual Architecture Analysis)",
        "amazon.nova-micro-v1:0 (Risk Classification)",
        "amazon.nova-2-sonic-v1:0 (Voice Interaction)",
        "amazon.nova-canvas-v1:0 (Visual Report Generation)",
    ],
    "total_tools": 22,
}


# ========== STANDALONE EXECUTION ==========

if __name__ == "__main__":
    print(json.dumps(MCP_SERVER_INFO, indent=2))
    print(f"\nMCP Server: {mcp_server.name}")
    print(f"Running with real mcp SDK (FastMCP)")
    print(f"Integrated AWS MCP servers: 4")
    # Run the MCP server with stdio transport
    mcp_server.run()
