"""
Nova Sentinel MCP Server
Model Context Protocol server exposing security analysis tools.

Run standalone: python mcp_server.py
Or import tools for use with Strands agents.

This MCP server exposes Nova Sentinel's security capabilities as
standardized tools that any MCP-compatible client can use.
"""
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

# MCP Server implementation using FastAPI-compatible approach
# This can be used standalone or integrated with strands-agents

from agents.temporal_agent import TemporalAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.voice_agent import VoiceAgent
from agents.documentation_agent import DocumentationAgent
from utils.logger import logger
from utils.mock_data import get_crypto_mining_events, get_data_exfiltration_events

# Initialize agents
temporal_agent = TemporalAgent()
risk_scorer = RiskScorerAgent()
remediation_agent = RemediationAgent()
voice_agent = VoiceAgent()
documentation_agent = DocumentationAgent()


# ========== MCP TOOL DEFINITIONS ==========
# These define the tools available through the MCP protocol

MCP_TOOLS = [
    {
        "name": "analyze_security_events",
        "description": "Analyze CloudTrail security events to build an attack timeline, identify root cause, attack pattern, and blast radius. Uses Nova 2 Lite for temporal reasoning.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "events": {
                    "type": "array",
                    "description": "List of CloudTrail event objects to analyze",
                    "items": {"type": "object"}
                },
                "incident_type": {
                    "type": "string",
                    "description": "Type of incident (e.g., crypto-mining, data-exfiltration, privilege-escalation)",
                    "default": "Unknown"
                }
            },
            "required": ["events"]
        }
    },
    {
        "name": "score_event_risk",
        "description": "Score the risk level of a single security event using Nova Micro for ultra-fast classification. Returns severity, confidence, and MITRE ATT&CK mapping.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "event": {
                    "type": "object",
                    "description": "CloudTrail event to score"
                }
            },
            "required": ["event"]
        }
    },
    {
        "name": "generate_remediation_plan",
        "description": "Generate a step-by-step remediation plan for a security incident. Includes AWS CLI commands, IAM policy fixes, and compliance alignment.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "root_cause": {
                    "type": "string",
                    "description": "Root cause of the incident"
                },
                "attack_pattern": {
                    "type": "string",
                    "description": "Identified attack pattern"
                },
                "blast_radius": {
                    "type": "string",
                    "description": "Scope of impact"
                },
                "timeline_events": {
                    "type": "array",
                    "description": "Timeline events from analysis",
                    "items": {"type": "object"}
                }
            },
            "required": ["root_cause", "attack_pattern"]
        }
    },
    {
        "name": "query_incident",
        "description": "Ask a natural language question about a security incident. Uses Nova Sonic for conversational understanding.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language question about the incident"
                },
                "incident_context": {
                    "type": "object",
                    "description": "Current incident data for context",
                    "default": None
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "generate_documentation",
        "description": "Generate incident documentation including JIRA tickets, Slack messages, and Confluence post-mortem pages.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "incident_id": {
                    "type": "string",
                    "description": "Incident identifier"
                },
                "timeline": {
                    "type": "object",
                    "description": "Analysis timeline data"
                },
                "remediation_plan": {
                    "type": "object",
                    "description": "Generated remediation plan"
                }
            },
            "required": ["incident_id", "timeline"]
        }
    },
    {
        "name": "list_demo_scenarios",
        "description": "List available demo security scenarios for testing.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_demo_events",
        "description": "Get CloudTrail events for a specific demo scenario.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "scenario": {
                    "type": "string",
                    "enum": ["crypto-mining", "data-exfiltration"],
                    "description": "Demo scenario name"
                }
            },
            "required": ["scenario"]
        }
    }
]


# ========== TOOL HANDLERS ==========

async def handle_analyze_security_events(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle analyze_security_events tool call"""
    events = args.get("events", [])
    incident_type = args.get("incident_type", "Unknown")
    
    result = await temporal_agent.analyze_timeline(
        events=events,
        incident_type=incident_type
    )
    
    return result.dict() if hasattr(result, 'dict') else result


async def handle_score_event_risk(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle score_event_risk tool call"""
    event = args.get("event", {})
    return await risk_scorer.score_event_risk(event)


async def handle_generate_remediation_plan(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle generate_remediation_plan tool call"""
    return await remediation_agent.generate_remediation_plan(
        incident_analysis={"timeline": {}},
        root_cause=args.get("root_cause", "Unknown"),
        attack_pattern=args.get("attack_pattern", "Unknown"),
        blast_radius=args.get("blast_radius", "Unknown"),
        timeline_events=args.get("timeline_events", [])
    )


async def handle_query_incident(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle query_incident tool call"""
    return await voice_agent.process_voice_query(
        query_text=args.get("query", ""),
        incident_context=args.get("incident_context")
    )


async def handle_generate_documentation(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle generate_documentation tool call"""
    return await documentation_agent.generate_documentation(
        incident_id=args.get("incident_id", "UNKNOWN"),
        incident_analysis={"timeline": args.get("timeline", {})},
        timeline=args.get("timeline", {}),
        remediation_plan=args.get("remediation_plan")
    )


async def handle_list_demo_scenarios(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle list_demo_scenarios tool call"""
    return {
        "scenarios": [
            {"id": "crypto-mining", "name": "Crypto Mining Attack", "severity": "critical"},
            {"id": "data-exfiltration", "name": "Data Exfiltration via S3", "severity": "critical"},
        ]
    }


async def handle_get_demo_events(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle get_demo_events tool call"""
    scenario = args.get("scenario", "crypto-mining")
    if scenario == "crypto-mining":
        events = get_crypto_mining_events()
    elif scenario == "data-exfiltration":
        events = get_data_exfiltration_events()
    else:
        events = get_crypto_mining_events()
    
    return {"scenario": scenario, "events": events}


# Tool handler mapping
TOOL_HANDLERS = {
    "analyze_security_events": handle_analyze_security_events,
    "score_event_risk": handle_score_event_risk,
    "generate_remediation_plan": handle_generate_remediation_plan,
    "query_incident": handle_query_incident,
    "generate_documentation": handle_generate_documentation,
    "list_demo_scenarios": handle_list_demo_scenarios,
    "get_demo_events": handle_get_demo_events,
}


async def call_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call an MCP tool by name.
    
    Args:
        tool_name: Name of the tool to call
        arguments: Tool arguments
        
    Returns:
        Tool result
    """
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        raise ValueError(f"Unknown tool: {tool_name}")
    
    logger.info(f"MCP tool call: {tool_name}")
    return await handler(arguments)


def get_tool_definitions() -> List[Dict[str, Any]]:
    """Get all MCP tool definitions"""
    return MCP_TOOLS


# ========== MCP SERVER INFO ==========

MCP_SERVER_INFO = {
    "name": "nova-sentinel-mcp",
    "version": "1.0.0",
    "description": "Nova Sentinel Security Analysis MCP Server - Exposes AI-powered AWS security tools via Model Context Protocol",
    "capabilities": {
        "tools": True,
        "resources": True,
    },
    "tools": MCP_TOOLS,
    "models_used": [
        "amazon.nova-lite-v1:0 (Temporal Analysis, Documentation)",
        "amazon.nova-pro-v1:0 (Visual Architecture Analysis)",
        "amazon.nova-micro-v1:0 (Risk Classification)",
        "amazon.nova-sonic-v1:0 (Voice Interaction)",
    ]
}


if __name__ == "__main__":
    """Run MCP server info display"""
    print(json.dumps(MCP_SERVER_INFO, indent=2))
    print(f"\nAvailable tools: {len(MCP_TOOLS)}")
    for tool in MCP_TOOLS:
        print(f"  - {tool['name']}: {tool['description'][:80]}...")
