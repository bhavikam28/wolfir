"""
Risk Scorer Agent - Nova Micro powered fast risk classification
"""
import json
from typing import Dict, Any, Optional

from services.bedrock_service import BedrockService
from models.incident import SeverityLevel
from utils.logger import logger


class RiskScorerAgent:
    """
    Agent responsible for fast risk classification using Nova Micro
    Provides real-time risk scoring for security configurations and events
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
    
    async def score_risk(
        self,
        configuration: Dict[str, Any],
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Quickly classify risk level for a security configuration
        
        Args:
            configuration: Security configuration to analyze
            context: Optional context about the configuration
            
        Returns:
            Risk score with level, confidence, and rationale
        """
        try:
            logger.info("Starting risk scoring with Nova Micro")
            
            # Build prompt for risk classification
            config_json = json.dumps(configuration, indent=2, default=str)
            
            prompt = f"""Classify the security risk level for this AWS configuration:

Configuration:
{config_json}
{f"Context: {context}" if context else ""}

Classify as one of: LOW, MEDIUM, HIGH, CRITICAL

Provide your response in JSON format:
{{
  "risk_level": "CRITICAL",
  "confidence": 0.94,
  "rationale": "Brief explanation of why this risk level was assigned",
  "key_findings": ["finding 1", "finding 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}}

Return ONLY valid JSON, no additional text."""
            
            # Invoke Nova Micro for fast classification
            response = await self.bedrock.invoke_nova_micro(
                prompt=prompt,
                max_tokens=500,
                temperature=0.1  # Low for risk scoring consistency
            )
            
            # Parse response
            risk_assessment = self._parse_risk_response(response['text'])
            
            logger.info(f"Risk scoring complete: {risk_assessment.get('risk_level', 'UNKNOWN')}")
            
            return risk_assessment
            
        except Exception as e:
            logger.error(f"Error in risk scoring: {e}")
            raise
    
    async def score_event_risk(
        self,
        event: Dict[str, Any],
        event_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Quickly score risk for a single CloudTrail event
        
        Args:
            event: CloudTrail event to score
            event_type: Optional event type classification
            
        Returns:
            Risk score for the event
        """
        try:
            event_json = json.dumps(event, indent=2, default=str)
            
            prompt = f"""Classify the security risk level for this AWS CloudTrail event:

Event:
{event_json}
{f"Event Type: {event_type}" if event_type else ""}

Consider:
- The API action being performed
- The user/role performing it
- The resource being accessed
- The source IP address
- Any error codes

Classify as one of: LOW, MEDIUM, HIGH, CRITICAL

If this event represents a recognizable attack technique, include the MITRE ATT&CK technique ID (e.g. T1098 for Account Manipulation, T1562 for Impair Defenses). Use the format T####. If unsure, omit mitre_technique_id.

Provide your response in JSON format:
{{
  "risk_level": "HIGH",
  "confidence": 0.92,
  "rationale": "Brief explanation",
  "indicators": ["indicator 1", "indicator 2"],
  "mitre_technique_id": "T1098",
  "mitre_technique_name": "Account Manipulation"
}}

Return ONLY valid JSON, no additional text."""
            
            response = await self.bedrock.invoke_nova_micro(
                prompt=prompt,
                max_tokens=300,
                temperature=0.1
            )
            
            risk_assessment = self._parse_risk_response(response['text'])
            
            return risk_assessment
            
        except Exception as e:
            logger.error(f"Error scoring event risk: {e}")
            raise
    
    def _parse_risk_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Nova Micro risk scoring response"""
        try:
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                return json.loads(response_text)
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse risk response: {e}")
            logger.error(f"Response text: {response_text[:200]}")
            
            return {
                "risk_level": "MEDIUM",
                "confidence": 0.5,
                "rationale": "Failed to parse risk assessment",
                "key_findings": [],
                "recommendations": []
            }
    
    def _severity_to_risk_level(self, severity: SeverityLevel) -> str:
        """Convert SeverityLevel enum to risk level string"""
        mapping = {
            SeverityLevel.LOW: "LOW",
            SeverityLevel.MEDIUM: "MEDIUM",
            SeverityLevel.HIGH: "HIGH",
            SeverityLevel.CRITICAL: "CRITICAL"
        }
        return mapping.get(severity, "MEDIUM")
