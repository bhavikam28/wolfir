"""
Nova Act Agent — Real Browser Automation for Security Remediation
Uses the REAL nova-act SDK for automated AWS Console operations.

pip install nova-act

Nova Act is a browser automation model that can:
1. Navigate the AWS Console to remediate security issues
2. Create JIRA tickets through browser automation
3. Configure CloudWatch alarms via the console
4. Review and modify IAM policies visually

The agent operates in two modes:
- PLAN mode: Generates automation plans (always available)
- LIVE mode: Executes browser automation via Nova Act SDK (requires browser)
"""
import json
import time
import os
from typing import Dict, Any, List, Optional

from utils.logger import logger

# Import the REAL Nova Act SDK
try:
    from nova_act import NovaAct
    NOVA_ACT_AVAILABLE = True
    logger.info("Nova Act SDK loaded successfully")
except ImportError:
    NOVA_ACT_AVAILABLE = False
    logger.warning("Nova Act SDK not available — plan-only mode")


class NovaActAgent:
    """
    Security remediation agent powered by Amazon Nova Act.
    
    Uses the real nova-act SDK for browser-based automation of AWS Console
    operations. Falls back to plan generation when browser is not available.
    """
    
    def __init__(self):
        self.api_key = os.environ.get("NOVA_ACT_API_KEY", "")
        self.execution_history: List[Dict[str, Any]] = []
        
        if NOVA_ACT_AVAILABLE:
            logger.info("NovaActAgent initialized — SDK available")
        else:
            logger.info("NovaActAgent initialized — plan-only mode (no browser)")
    
    async def remediate_iam_issue(
        self,
        role_name: str,
        action: str = "deactivate_keys",
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """
        Remediate an IAM security issue using Nova Act browser automation.
        
        Args:
            role_name: Name of the IAM role/user to remediate
            action: Remediation action (deactivate_keys, remove_admin, restrict_policy)
            dry_run: If True, plan only. If False, execute in browser.
            
        Returns:
            Remediation result with steps taken and verification
        """
        start_time = time.time()
        
        # Define the remediation steps for Nova Act
        remediation_steps = self._build_iam_remediation_steps(role_name, action)
        
        result = {
            "role_name": role_name,
            "action": action,
            "mode": "plan" if dry_run else "live",
            "nova_act_available": NOVA_ACT_AVAILABLE,
            "steps": remediation_steps,
        }
        
        if not dry_run and NOVA_ACT_AVAILABLE and self.api_key:
            # LIVE MODE — Execute with real Nova Act SDK
            try:
                execution_result = self._execute_nova_act(remediation_steps)
                result["execution"] = execution_result
                result["status"] = "executed"
            except Exception as e:
                logger.error(f"Nova Act execution failed: {e}")
                result["execution_error"] = str(e)
                result["status"] = "failed"
        else:
            result["status"] = "planned"
            if not dry_run:
                result["note"] = (
                    "Live execution requires: "
                    "1) nova-act SDK installed, "
                    "2) NOVA_ACT_API_KEY set, "
                    "3) headed browser environment"
                )
        
        result["processing_time_ms"] = int((time.time() - start_time) * 1000)
        result["model_used"] = "amazon.nova-act"
        
        self.execution_history.append({
            "action": action,
            "role_name": role_name,
            "mode": result["mode"],
            "status": result["status"],
            "timestamp": time.time(),
        })
        
        return result
    
    def _build_iam_remediation_steps(self, role_name: str, action: str) -> List[Dict[str, Any]]:
        """Build the remediation steps that Nova Act will execute."""
        
        base_steps = [
            {
                "step": 1,
                "nova_act_instruction": f"Navigate to the IAM console at https://console.aws.amazon.com/iam/",
                "url": "https://console.aws.amazon.com/iam/",
                "description": "Open IAM Console",
                "aws_cli_alternative": "aws iam list-roles",
            },
            {
                "step": 2,
                "nova_act_instruction": f"Click on 'Roles' in the left sidebar, then search for '{role_name}'",
                "description": f"Find role: {role_name}",
                "aws_cli_alternative": f"aws iam get-role --role-name {role_name}",
            },
        ]
        
        if action == "deactivate_keys":
            base_steps.extend([
                {
                    "step": 3,
                    "nova_act_instruction": f"Click on the role '{role_name}' to open its details",
                    "description": "Open role details",
                },
                {
                    "step": 4,
                    "nova_act_instruction": "Navigate to the 'Security credentials' tab and find all access keys",
                    "description": "Find access keys",
                    "aws_cli_alternative": f"aws iam list-access-keys --user-name {role_name}",
                },
                {
                    "step": 5,
                    "nova_act_instruction": "For each active access key, click 'Make inactive' to deactivate it",
                    "description": "Deactivate all access keys",
                    "aws_cli_alternative": f"aws iam update-access-key --user-name {role_name} --access-key-id <ACCESS_KEY_ID> --status Inactive",
                },
            ])
        elif action == "remove_admin":
            base_steps.extend([
                {
                    "step": 3,
                    "nova_act_instruction": f"Click on role '{role_name}', go to Permissions tab",
                    "description": "Open role permissions",
                },
                {
                    "step": 4,
                    "nova_act_instruction": "Find and select 'AdministratorAccess' policy, then click 'Remove'",
                    "description": "Remove AdministratorAccess policy",
                    "aws_cli_alternative": f"aws iam detach-role-policy --role-name {role_name} --policy-arn arn:aws:iam::aws:policy/AdministratorAccess",
                },
                {
                    "step": 5,
                    "nova_act_instruction": "Confirm the removal in the dialog box",
                    "description": "Confirm policy removal",
                },
            ])
        elif action == "restrict_policy":
            base_steps.extend([
                {
                    "step": 3,
                    "nova_act_instruction": f"Click on role '{role_name}', go to Permissions tab",
                    "description": "Open role permissions",
                },
                {
                    "step": 4,
                    "nova_act_instruction": "Review all attached policies and identify overly permissive ones",
                    "description": "Audit attached policies",
                    "aws_cli_alternative": f"aws iam list-attached-role-policies --role-name {role_name}",
                },
                {
                    "step": 5,
                    "nova_act_instruction": "For each overly permissive policy, create a scoped-down replacement following least-privilege",
                    "description": "Apply least-privilege policies",
                },
            ])
        
        return base_steps
    
    def _execute_nova_act(self, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute remediation steps using the real Nova Act SDK.
        
        This method creates a NovaAct session and executes each step
        as a browser automation instruction.
        """
        if not NOVA_ACT_AVAILABLE:
            raise RuntimeError("Nova Act SDK not installed")
        
        results = []
        
        # Create Nova Act session targeting AWS Console
        with NovaAct(
            starting_page="https://console.aws.amazon.com/iam/",
            headless=True,
            nova_act_api_key=self.api_key,
        ) as nova:
            for step in steps:
                instruction = step.get("nova_act_instruction", "")
                if not instruction:
                    continue
                
                try:
                    # Execute the instruction via Nova Act
                    act_result = nova.act(instruction)
                    results.append({
                        "step": step["step"],
                        "instruction": instruction,
                        "success": act_result.success if hasattr(act_result, 'success') else True,
                        "output": str(act_result) if act_result else "completed",
                    })
                    logger.info(f"Nova Act step {step['step']}: {step['description']} — success")
                except Exception as e:
                    results.append({
                        "step": step["step"],
                        "instruction": instruction,
                        "success": False,
                        "error": str(e),
                    })
                    logger.error(f"Nova Act step {step['step']} failed: {e}")
        
        return {
            "steps_executed": len(results),
            "steps_successful": sum(1 for r in results if r.get("success")),
            "results": results,
        }
    
    async def generate_remediation_automation(
        self,
        incident_type: str,
        root_cause: str,
        affected_resources: List[str],
        remediation_steps: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive browser automation plan for incident remediation.
        
        Creates structured Nova Act instructions that can be executed
        to remediate security issues via the AWS Console.
        """
        start_time = time.time()
        
        automation_plan = {
            "title": f"Nova Act Remediation — {incident_type}",
            "total_steps": len(remediation_steps),
            "estimated_time_minutes": len(remediation_steps) * 2,
            "nova_act_available": NOVA_ACT_AVAILABLE,
            "steps": [],
        }
        
        for i, step in enumerate(remediation_steps[:10]):
            action = step.get("action", step.get("title", "Unknown"))
            automation_plan["steps"].append({
                "step_number": i + 1,
                "action": action,
                "nova_act_instruction": f"Execute: {action}",
                "url": self._get_aws_console_url(action),
                "aws_cli_alternative": step.get("aws_cli", ""),
                "verification": f"Verify {action} was completed successfully",
            })
        
        # Generate AWS CLI scripts as alternatives
        aws_cli_scripts = []
        for step in remediation_steps[:10]:
            cli_cmd = step.get("aws_cli", "")
            if cli_cmd:
                aws_cli_scripts.append({
                    "description": step.get("action", step.get("title", "")),
                    "command": cli_cmd,
                    "risk_level": step.get("priority", "medium").lower(),
                })
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return {
            "automation_plan": automation_plan,
            "aws_cli_scripts": aws_cli_scripts,
            "rollback_plan": {
                "description": "Steps to rollback if remediation causes issues",
                "steps": [
                    "1. Check CloudTrail for recent changes made by remediation",
                    "2. Restore previous IAM policies from backup",
                    "3. Re-enable any disabled access keys if needed",
                    "4. Review CloudWatch alarms for anomalies post-remediation",
                ]
            },
            "processing_time_ms": processing_time,
            "model_used": "amazon.nova-act",
            "agent": "nova-act-remediation",
        }
    
    async def create_jira_ticket(
        self,
        incident_id: str,
        summary: str,
        description: str,
        severity: str,
        jira_url: Optional[str] = None,
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """
        Create a JIRA ticket for a security incident using Nova Act.
        
        In LIVE mode, Nova Act navigates to JIRA and creates the ticket.
        In PLAN mode, generates the ticket content and automation steps.
        """
        start_time = time.time()
        
        ticket = {
            "project": "SEC",
            "type": "Bug",
            "priority": severity.upper(),
            "summary": f"[{severity.upper()}] {summary}",
            "description": description,
            "labels": ["security-incident", "wolfir", "automated"],
            "assignee": "security-team",
            "incident_id": incident_id,
        }
        
        automation_steps = [
            {"step": 1, "nova_act_instruction": f"Navigate to {jira_url or 'https://your-org.atlassian.net'}/jira/create"},
            {"step": 2, "nova_act_instruction": f"Select project 'SEC' and issue type 'Bug'"},
            {"step": 3, "nova_act_instruction": f"Set summary to '{ticket['summary']}'"},
            {"step": 4, "nova_act_instruction": f"Set priority to '{severity.upper()}'"},
            {"step": 5, "nova_act_instruction": f"Paste the description into the Description field"},
            {"step": 6, "nova_act_instruction": "Add labels: security-incident, wolfir, automated"},
            {"step": 7, "nova_act_instruction": "Click 'Create' to submit the ticket"},
        ]
        
        result = {
            "ticket": ticket,
            "automation_steps": automation_steps,
            "mode": "plan" if dry_run else "live",
            "nova_act_available": NOVA_ACT_AVAILABLE,
            "processing_time_ms": int((time.time() - start_time) * 1000),
            "model_used": "amazon.nova-act",
            "agent": "nova-act-jira",
        }
        
        if not dry_run and NOVA_ACT_AVAILABLE and jira_url and self.api_key:
            try:
                with NovaAct(
                    starting_page=jira_url,
                    headless=True,
                    nova_act_api_key=self.api_key,
                ) as nova:
                    for step in automation_steps:
                        nova.act(step["nova_act_instruction"])
                result["status"] = "created"
            except Exception as e:
                result["status"] = "failed"
                result["error"] = str(e)
        else:
            result["status"] = "planned"
        
        return result
    
    def _get_aws_console_url(self, action: str) -> str:
        """Get the relevant AWS Console URL for an action."""
        action_lower = action.lower()
        if "iam" in action_lower or "role" in action_lower or "policy" in action_lower:
            return "https://console.aws.amazon.com/iam/"
        elif "ec2" in action_lower or "instance" in action_lower:
            return "https://console.aws.amazon.com/ec2/"
        elif "s3" in action_lower or "bucket" in action_lower:
            return "https://console.aws.amazon.com/s3/"
        elif "cloudtrail" in action_lower:
            return "https://console.aws.amazon.com/cloudtrail/"
        elif "cloudwatch" in action_lower or "alarm" in action_lower:
            return "https://console.aws.amazon.com/cloudwatch/"
        elif "security" in action_lower or "guardduty" in action_lower:
            return "https://console.aws.amazon.com/guardduty/"
        else:
            return "https://console.aws.amazon.com/"
