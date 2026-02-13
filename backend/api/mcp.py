"""
MCP Server API endpoints
Exposes Nova Sentinel security tools via Model Context Protocol.

Three interfaces:
1. Standard MCP SSE endpoint (mounted at /mcp/) — for MCP-compatible clients
2. REST API endpoints (at /api/mcp/) — for our frontend and direct API access
3. AWS MCP server endpoints — CloudTrail, IAM, CloudWatch, Nova Canvas

Uses the real mcp package (FastMCP) and real strands-agents SDK.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

from mcp_server import MCP_SERVER_INFO, mcp_server
from agents.strands_orchestrator import StrandsOrchestrator, STRANDS_TOOLS
from mcp_servers.cloudtrail_mcp import get_cloudtrail_mcp
from mcp_servers.iam_mcp import get_iam_mcp
from mcp_servers.cloudwatch_mcp import get_cloudwatch_mcp
from mcp_servers.nova_canvas_mcp import get_nova_canvas_mcp
from utils.logger import logger

router = APIRouter(prefix="/api/mcp", tags=["mcp"])

# Initialize Strands orchestrator (uses real strands-agents SDK)
strands = StrandsOrchestrator()


class ToolCallRequest(BaseModel):
    """Request to call an MCP tool"""
    tool_name: str
    arguments: Dict[str, Any] = {}


class StrandsAnalysisRequest(BaseModel):
    """Request for Strands-orchestrated analysis"""
    events: List[Dict[str, Any]]
    incident_type: str = "Unknown"
    voice_query: str = None


class StrandsQueryRequest(BaseModel):
    """Request for interactive Strands Agent query"""
    prompt: str


class NovaCanvasRequest(BaseModel):
    """Request for Nova Canvas image generation"""
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    quality: str = "standard"
    cfg_scale: float = 8.0
    seed: int = 0
    num_images: int = 1


class ReportCoverRequest(BaseModel):
    """Request for security report cover generation"""
    incident_type: str
    severity: str = "CRITICAL"
    incident_id: str = "INC-000000"
    attack_pattern: str = ""
    affected_services: List[str] = []


class AttackPathVisualRequest(BaseModel):
    """Request for attack path visualization"""
    attack_stages: List[str]
    severity: str = "CRITICAL"


@router.get("/server-info")
async def get_server_info() -> Dict[str, Any]:
    """
    Get MCP server information and capabilities.
    
    Returns server metadata, available tools, integrated MCP servers,
    and SDK version information.
    """
    return {
        **MCP_SERVER_INFO,
        "strands_tools": len(STRANDS_TOOLS),
        "strands_sdk": "strands-agents (real)",
        "mcp_sdk": "mcp (FastMCP, real)",
    }


@router.get("/tools")
async def list_tools() -> Dict[str, Any]:
    """
    List all available MCP tools.
    
    Returns tool definitions from the MCP server, Strands agent,
    and integrated AWS MCP servers.
    """
    return {
        "mcp_server": mcp_server.name,
        "mcp_sdk": "mcp>=1.11.0",
        "strands_sdk": "strands-agents",
        "tools": strands.get_registered_tools(),
        "count": len(STRANDS_TOOLS),
        "mcp_servers_integrated": [
            "cloudtrail-mcp-server",
            "iam-mcp-server",
            "cloudwatch-mcp-server",
            "nova-canvas-mcp-server",
        ],
    }


@router.post("/call-tool")
async def tool_call(request: ToolCallRequest) -> Dict[str, Any]:
    """
    Call an MCP tool by name via REST API.
    
    This provides REST access to the same tools exposed via the MCP SSE endpoint.
    """
    try:
        logger.info(f"MCP REST tool call: {request.tool_name}")
        
        # Map tool names to MCP server tools
        from mcp_server import (
            analyze_security_events,
            score_event_risk,
            generate_remediation_plan,
            query_incident,
            generate_documentation,
            list_demo_scenarios,
            get_demo_events,
            cloudtrail_lookup_events,
            cloudtrail_get_trail_status,
            cloudtrail_scan_anomalies,
            iam_audit_users,
            iam_audit_roles,
            iam_analyze_policy,
            iam_account_summary,
            cloudwatch_security_alarms,
            cloudwatch_api_metrics,
            cloudwatch_ec2_security,
            cloudwatch_billing_anomalies,
            nova_canvas_generate_image,
            nova_canvas_generate_with_colors,
            nova_canvas_security_report_cover,
            nova_canvas_attack_path_visual,
        )
        
        tool_map = {
            "analyze_security_events": analyze_security_events,
            "score_event_risk": score_event_risk,
            "generate_remediation_plan": generate_remediation_plan,
            "query_incident": query_incident,
            "generate_documentation": generate_documentation,
            "list_demo_scenarios": list_demo_scenarios,
            "get_demo_events": get_demo_events,
            # CloudTrail MCP
            "cloudtrail_lookup_events": cloudtrail_lookup_events,
            "cloudtrail_get_trail_status": cloudtrail_get_trail_status,
            "cloudtrail_scan_anomalies": cloudtrail_scan_anomalies,
            # IAM MCP
            "iam_audit_users": iam_audit_users,
            "iam_audit_roles": iam_audit_roles,
            "iam_analyze_policy": iam_analyze_policy,
            "iam_account_summary": iam_account_summary,
            # CloudWatch MCP
            "cloudwatch_security_alarms": cloudwatch_security_alarms,
            "cloudwatch_api_metrics": cloudwatch_api_metrics,
            "cloudwatch_ec2_security": cloudwatch_ec2_security,
            "cloudwatch_billing_anomalies": cloudwatch_billing_anomalies,
            # Nova Canvas MCP
            "nova_canvas_generate_image": nova_canvas_generate_image,
            "nova_canvas_generate_with_colors": nova_canvas_generate_with_colors,
            "nova_canvas_security_report_cover": nova_canvas_security_report_cover,
            "nova_canvas_attack_path_visual": nova_canvas_attack_path_visual,
        }
        
        handler = tool_map.get(request.tool_name)
        if not handler:
            raise ValueError(f"Unknown tool: {request.tool_name}. Available: {list(tool_map.keys())}")
        
        result = await handler(**request.arguments)
        return {
            "tool": request.tool_name,
            "result": result,
            "status": "success",
            "sdk": "mcp (FastMCP)"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"MCP tool call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")


# ================================================================
# CLOUDTRAIL MCP ENDPOINTS
# ================================================================

@router.get("/cloudtrail/events")
async def cloudtrail_events(
    category: str = "all",
    days_back: int = 7,
    max_results: int = 50
) -> Dict[str, Any]:
    """Lookup CloudTrail events using the CloudTrail MCP server."""
    ct = get_cloudtrail_mcp()
    return await ct.lookup_security_events(category, days_back, max_results)


@router.get("/cloudtrail/trail-status")
async def cloudtrail_trail_status() -> Dict[str, Any]:
    """Get CloudTrail trail status."""
    ct = get_cloudtrail_mcp()
    return await ct.get_trail_status()


@router.get("/cloudtrail/anomalies")
async def cloudtrail_anomalies(days_back: int = 1) -> Dict[str, Any]:
    """Scan for CloudTrail anomalies."""
    ct = get_cloudtrail_mcp()
    return await ct.scan_for_anomalies(days_back)


# ================================================================
# IAM MCP ENDPOINTS
# ================================================================

@router.get("/iam/audit-users")
async def iam_users_audit() -> Dict[str, Any]:
    """Audit IAM users using the IAM MCP server."""
    iam = get_iam_mcp()
    return await iam.audit_iam_users()


@router.get("/iam/audit-roles")
async def iam_roles_audit() -> Dict[str, Any]:
    """Audit IAM roles using the IAM MCP server."""
    iam = get_iam_mcp()
    return await iam.audit_iam_roles()


@router.get("/iam/account-summary")
async def iam_summary() -> Dict[str, Any]:
    """Get IAM account summary."""
    iam = get_iam_mcp()
    return await iam.get_account_summary()


@router.post("/iam/analyze-policy")
async def iam_policy(policy_arn: str) -> Dict[str, Any]:
    """Analyze a specific IAM policy."""
    iam = get_iam_mcp()
    return await iam.analyze_policy(policy_arn)


# ================================================================
# CLOUDWATCH MCP ENDPOINTS
# ================================================================

@router.get("/cloudwatch/alarms")
async def cw_alarms() -> Dict[str, Any]:
    """Get CloudWatch security alarms."""
    cw = get_cloudwatch_mcp()
    return await cw.get_security_alarms()


@router.get("/cloudwatch/api-metrics")
async def cw_api_metrics(hours_back: int = 24) -> Dict[str, Any]:
    """Get API call volume metrics."""
    cw = get_cloudwatch_mcp()
    return await cw.get_api_call_metrics(hours_back)


@router.get("/cloudwatch/ec2-security")
async def cw_ec2(hours_back: int = 6) -> Dict[str, Any]:
    """Get EC2 security metrics."""
    cw = get_cloudwatch_mcp()
    return await cw.get_ec2_security_metrics(hours_back)


@router.get("/cloudwatch/billing")
async def cw_billing(days_back: int = 7) -> Dict[str, Any]:
    """Check for billing anomalies."""
    cw = get_cloudwatch_mcp()
    return await cw.get_billing_anomalies(days_back)


# ================================================================
# NOVA CANVAS MCP ENDPOINTS
# ================================================================

@router.post("/nova-canvas/generate")
async def canvas_generate(request: NovaCanvasRequest) -> Dict[str, Any]:
    """Generate an image using Nova Canvas MCP server."""
    nc = get_nova_canvas_mcp()
    return await nc.generate_image(
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        width=request.width,
        height=request.height,
        quality=request.quality,
        cfg_scale=request.cfg_scale,
        seed=request.seed,
        num_images=request.num_images,
    )


@router.post("/nova-canvas/report-cover")
async def canvas_report_cover(request: ReportCoverRequest) -> Dict[str, Any]:
    """Generate a security report cover using Nova Canvas."""
    nc = get_nova_canvas_mcp()
    return await nc.generate_security_report_cover(
        incident_type=request.incident_type,
        severity=request.severity,
        incident_id=request.incident_id,
        attack_pattern=request.attack_pattern,
        affected_services=request.affected_services,
    )


@router.post("/nova-canvas/attack-path")
async def canvas_attack_path(request: AttackPathVisualRequest) -> Dict[str, Any]:
    """Generate an attack path visualization using Nova Canvas."""
    nc = get_nova_canvas_mcp()
    return await nc.generate_attack_path_visual(
        attack_stages=request.attack_stages,
        severity=request.severity,
    )


# ================================================================
# STRANDS ENDPOINTS
# ================================================================

@router.get("/strands/tools")
async def list_strands_tools() -> Dict[str, Any]:
    """
    List all Strands agent tools registered with the orchestrator.
    
    Includes both core Nova agent tools and AWS MCP server tools.
    """
    return {
        "framework": "strands-agents",
        "sdk": "strands-agents (real)",
        "tools": strands.get_registered_tools(),
        "count": len(STRANDS_TOOLS),
        "categories": {
            "core_nova": 5,
            "cloudtrail_mcp": 2,
            "iam_mcp": 2,
            "cloudwatch_mcp": 2,
            "nova_canvas_mcp": 1,
        }
    }


@router.post("/strands/analyze")
async def strands_analyze(request: StrandsAnalysisRequest) -> Dict[str, Any]:
    """
    Run full Strands-orchestrated multi-agent analysis.
    
    The Strands orchestrator executes tools in dependency order,
    using the real @tool-decorated functions from the strands-agents SDK.
    """
    try:
        logger.info(f"Strands analysis: {len(request.events)} events, type={request.incident_type}")
        
        result = await strands.plan_and_execute(
            events=request.events,
            incident_type=request.incident_type,
            voice_query=request.voice_query
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Strands analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/strands/query")
async def strands_query(request: StrandsQueryRequest) -> Dict[str, Any]:
    """
    Interactive query using the Strands Agent.
    
    The Agent autonomously decides which tools to call based on the prompt.
    This demonstrates real agentic behavior — the Agent plans and executes on its own.
    """
    try:
        logger.info(f"Strands agent query: {request.prompt[:100]}...")
        
        response = await strands.agent_query(request.prompt)
        
        return {
            "response": response,
            "framework": "strands-agents",
            "mode": "autonomous",
        }
        
    except Exception as e:
        logger.error(f"Strands agent query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent query failed: {str(e)}")


@router.get("/strands/history")
async def strands_execution_history() -> Dict[str, Any]:
    """Get Strands agent execution history."""
    return {
        "history": strands.get_execution_history(),
        "count": len(strands.get_execution_history())
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check for MCP and Strands services."""
    return {
        "status": "healthy",
        "mcp_server": mcp_server.name,
        "mcp_sdk": "mcp>=1.11.0 (FastMCP)",
        "strands_sdk": "strands-agents (real)",
        "strands_tools": len(STRANDS_TOOLS),
        "mcp_servers": [
            "cloudtrail-mcp-server",
            "iam-mcp-server",
            "cloudwatch-mcp-server",
            "nova-canvas-mcp-server",
        ],
        "models": MCP_SERVER_INFO["models_used"],
    }
