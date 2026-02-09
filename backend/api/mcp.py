"""
MCP Server API endpoints
Exposes Nova Sentinel security tools via Model Context Protocol
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

from mcp_server import MCP_SERVER_INFO, MCP_TOOLS, call_tool, get_tool_definitions
from agents.strands_orchestrator import StrandsOrchestrator
from utils.logger import logger

router = APIRouter(prefix="/api/mcp", tags=["mcp"])

# Initialize Strands orchestrator
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


@router.get("/server-info")
async def get_server_info() -> Dict[str, Any]:
    """
    Get MCP server information and capabilities.
    
    Returns server metadata, available tools, and supported models.
    """
    return MCP_SERVER_INFO


@router.get("/tools")
async def list_tools() -> Dict[str, Any]:
    """
    List all available MCP tools.
    
    Returns tool definitions with input schemas.
    """
    return {
        "tools": get_tool_definitions(),
        "count": len(MCP_TOOLS)
    }


@router.post("/call-tool")
async def tool_call(request: ToolCallRequest) -> Dict[str, Any]:
    """
    Call an MCP tool by name.
    
    Args:
        request: Tool name and arguments
        
    Returns:
        Tool execution result
    """
    try:
        logger.info(f"MCP tool call: {request.tool_name}")
        result = await call_tool(request.tool_name, request.arguments)
        return {
            "tool": request.tool_name,
            "result": result,
            "status": "success"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"MCP tool call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")


@router.get("/strands/tools")
async def list_strands_tools() -> Dict[str, Any]:
    """
    List all Strands agent tools registered with the orchestrator.
    """
    return {
        "framework": "strands-agents",
        "tools": strands.get_registered_tools(),
        "count": len(strands.tools)
    }


@router.post("/strands/analyze")
async def strands_analyze(request: StrandsAnalysisRequest) -> Dict[str, Any]:
    """
    Run full Strands-orchestrated multi-agent analysis.
    
    The Strands orchestrator automatically plans and executes the
    optimal sequence of AI agents based on available inputs.
    
    Args:
        request: Events, incident type, and optional voice query
        
    Returns:
        Complete analysis with all agent outputs
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


@router.get("/strands/history")
async def strands_execution_history() -> Dict[str, Any]:
    """
    Get Strands agent execution history.
    """
    return {
        "history": strands.get_execution_history(),
        "count": len(strands.get_execution_history())
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check for MCP and Strands services"""
    return {
        "status": "healthy",
        "mcp_server": MCP_SERVER_INFO["name"],
        "mcp_version": MCP_SERVER_INFO["version"],
        "strands_tools": len(strands.tools),
        "mcp_tools": len(MCP_TOOLS),
        "models": MCP_SERVER_INFO["models_used"]
    }
