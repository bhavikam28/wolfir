"""
AWS MCP Server Integrations for Nova Sentinel

Custom MCP servers (awslabs-inspired patterns) using boto3 + FastMCP.
Each module provides MCP-compatible tools for a specific AWS service:

- cloudtrail_mcp: CloudTrail event lookup, security scanning
- iam_mcp: IAM policy analysis, role auditing, access review
- cloudwatch_mcp: Security metric monitoring, anomaly detection
- security_hub_mcp: Security Hub findings (GuardDuty, Inspector, etc.)
- nova_canvas_mcp: Visual report generation using Nova Canvas
"""
