"""
AI Security MCP Server — Bedrock inventory, OWASP LLM, guardrail recommendations.
Part of wolfir AI-SPM for AWS.
"""
from typing import Dict, Any

from services.ai_security_service import (
    list_bedrock_models,
    list_bedrock_agents,
    get_guardrail_recommendations,
    generate_owasp_llm_report,
)
from services.ai_pipeline_monitor import scan_for_prompt_injection, validate_model_output
from utils.config import get_settings
from utils.logger import logger

_ai_security_mcp_instance = None


def get_ai_security_mcp() -> "AISecurityMCPServer":
    """Singleton accessor for AI Security MCP server."""
    global _ai_security_mcp_instance
    if _ai_security_mcp_instance is None:
        _ai_security_mcp_instance = AISecurityMCPServer()
    return _ai_security_mcp_instance


class AISecurityMCPServer:
    """
    AI Security MCP tools for AWS AI asset discovery and posture.
    """

    async def list_bedrock_models(self) -> Dict[str, Any]:
        """List Bedrock foundation models for AI-BOM inventory."""
        return await list_bedrock_models()

    async def list_bedrock_agents(self) -> Dict[str, Any]:
        """List Bedrock agents for agentic AI threat assessment."""
        return await list_bedrock_agents()

    async def get_guardrail_recommendations(self) -> Dict[str, Any]:
        """Get guardrail configuration recommendations."""
        return await get_guardrail_recommendations()

    async def scan_prompt_injection(self, input_text: str = "") -> Dict[str, Any]:
        """Scan input for prompt injection patterns (LLM01)."""
        return scan_for_prompt_injection(input_text or "")

    async def get_owasp_llm_status(self) -> Dict[str, Any]:
        """Get OWASP LLM Security Top 10 compliance posture."""
        s = get_settings()
        guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
        return generate_owasp_llm_report(guardrail_active=guardrail_active)
