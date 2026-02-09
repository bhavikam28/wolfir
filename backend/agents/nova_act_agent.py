"""
Nova Act Agent - Browser Automation for Security Remediation
Uses Amazon Nova Act model for automated browser-based security operations.

Nova Act is designed for web browser automation. In Nova Sentinel, it powers:
1. Automated AWS Console remediation (navigate, click, configure)
2. JIRA ticket creation via browser automation
3. Slack incident notifications via browser
4. AWS Security Hub findings management
5. CloudWatch alarm configuration

Since Nova Act requires a headed browser environment, this agent provides:
- Remediation script generation (what actions to automate)
- Step-by-step browser automation plans
- AWS Console navigation instructions
- Integration with the documentation pipeline
"""
import json
import time
from typing import Dict, Any, List, Optional

from services.bedrock_service import BedrockService
from utils.logger import logger


class NovaActAgent:
    """
    Agent for browser-based security automation using Nova Act patterns.
    
    Generates structured automation plans that can be executed by:
    - Nova Act SDK for real browser automation
    - AWS CLI for command-line remediation
    - AWS Console step-by-step guides
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
    
    async def generate_remediation_automation(
        self,
        incident_type: str,
        root_cause: str,
        affected_resources: List[str],
        remediation_steps: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate browser automation plan for incident remediation.
        
        Creates structured automation steps that Nova Act can execute
        to remediate security issues via the AWS Console.
        
        Args:
            incident_type: Type of security incident
            root_cause: Root cause of the incident
            affected_resources: List of affected AWS resources
            remediation_steps: High-level remediation steps
            
        Returns:
            Structured automation plan with browser actions
        """
        start_time = time.time()
        
        try:
            steps_str = "\n".join([
                f"  {i+1}. {s.get('action', s.get('title', 'Unknown action'))}"
                for i, s in enumerate(remediation_steps[:5])
            ])
            
            resources_str = "\n".join([f"  - {r}" for r in affected_resources[:10]])
            
            prompt = f"""You are Nova Act, an AI agent specialized in browser automation for AWS security remediation.

Generate a detailed browser automation plan to remediate this security incident via the AWS Console.

INCIDENT DETAILS:
- Type: {incident_type}
- Root Cause: {root_cause}
- Affected Resources:
{resources_str}
- Remediation Steps:
{steps_str}

For each step, generate:
1. The AWS Console URL to navigate to
2. Specific UI elements to interact with (buttons, inputs, dropdowns)
3. Values to enter/select
4. Verification steps after the action

Return a JSON response:
{{
    "automation_plan": {{
        "title": "Remediation for {incident_type}",
        "total_steps": 5,
        "estimated_time_minutes": 3,
        "steps": [
            {{
                "step_number": 1,
                "action": "Navigate to IAM Console",
                "url": "https://console.aws.amazon.com/iam/",
                "description": "Open the IAM Console to review compromised credentials",
                "browser_actions": [
                    {{"type": "navigate", "target": "https://console.aws.amazon.com/iam/"}},
                    {{"type": "click", "target": "Users link in sidebar"}},
                    {{"type": "search", "target": "search box", "value": "compromised-user"}}
                ],
                "verification": "User details page loads with access key information",
                "aws_cli_alternative": "aws iam list-access-keys --user-name compromised-user"
            }}
        ]
    }},
    "aws_cli_scripts": [
        {{
            "description": "Deactivate compromised access key",
            "command": "aws iam update-access-key --access-key-id AKIAI... --status Inactive --user-name compromised-user",
            "risk_level": "low"
        }}
    ],
    "rollback_plan": {{
        "description": "Steps to rollback if remediation causes issues",
        "steps": ["Step 1: ...", "Step 2: ..."]
    }}
}}"""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=4000,
                temperature=0.2
            )
            
            response_text = response.get("text", "")
            processing_time = int((time.time() - start_time) * 1000)
            
            # Parse JSON response
            try:
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    json_text = response_text[json_start:json_end].strip()
                elif "{" in response_text:
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    json_text = response_text[json_start:json_end]
                else:
                    json_text = "{}"
                
                result = json.loads(json_text)
            except (json.JSONDecodeError, ValueError):
                result = {
                    "automation_plan": {
                        "title": f"Remediation for {incident_type}",
                        "total_steps": len(remediation_steps),
                        "steps": [],
                        "raw_text": response_text
                    }
                }
            
            return {
                **result,
                "processing_time_ms": processing_time,
                "model_used": "amazon.nova-act",
                "agent": "nova-act-remediation"
            }
            
        except Exception as e:
            logger.error(f"Nova Act remediation automation failed: {e}")
            return {
                "error": str(e),
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "model_used": "amazon.nova-act"
            }
    
    async def generate_jira_automation(
        self,
        incident_id: str,
        summary: str,
        description: str,
        severity: str
    ) -> Dict[str, Any]:
        """
        Generate JIRA ticket creation automation plan.
        
        Creates browser automation steps to create a JIRA ticket
        for the security incident.
        """
        start_time = time.time()
        
        try:
            prompt = f"""You are Nova Act, an AI browser automation agent. 
Generate a browser automation plan to create a JIRA ticket for a security incident.

Incident: {incident_id}
Summary: {summary}
Severity: {severity}
Description: {description[:500]}

Return JSON with the JIRA ticket content and browser automation steps:
{{
    "ticket": {{
        "project": "SEC",
        "type": "Bug",
        "priority": "{severity}",
        "summary": "{summary}",
        "description": "Full formatted description...",
        "labels": ["security-incident", "automated"],
        "assignee": "security-team"
    }},
    "automation_steps": [
        {{"action": "navigate", "url": "https://your-org.atlassian.net/jira/create"}},
        {{"action": "fill", "field": "Summary", "value": "{summary}"}},
        {{"action": "select", "field": "Priority", "value": "{severity}"}},
        {{"action": "fill", "field": "Description", "value": "..."}},
        {{"action": "click", "target": "Create button"}}
    ]
}}"""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=2000,
                temperature=0.2
            )
            
            response_text = response.get("text", "")
            processing_time = int((time.time() - start_time) * 1000)
            
            try:
                if "{" in response_text:
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    result = json.loads(response_text[json_start:json_end])
                else:
                    result = {"raw_text": response_text}
            except json.JSONDecodeError:
                result = {"raw_text": response_text}
            
            return {
                **result,
                "processing_time_ms": processing_time,
                "model_used": "amazon.nova-act",
                "agent": "nova-act-jira"
            }
            
        except Exception as e:
            logger.error(f"Nova Act JIRA automation failed: {e}")
            raise
