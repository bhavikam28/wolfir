"""
Visual Agent - Nova Pro powered diagram and image analysis
Analyzes architecture diagrams, detects configuration drift, and identifies security gaps
"""
import json
import base64
import time
from typing import Dict, Any, Optional, List
from pathlib import Path

from services.bedrock_service import BedrockService
from utils.logger import logger


class VisualAgent:
    """
    Agent responsible for visual analysis of architecture diagrams and screenshots
    using Nova Pro for multimodal understanding
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
        
    def _image_format_from_content_type(self, content_type: Optional[str], filename: Optional[str] = None) -> str:
        """Infer image format from content_type or filename. Default png."""
        if content_type:
            if "jpeg" in content_type or "jpg" in content_type:
                return "jpeg"
            if "png" in content_type:
                return "png"
            if "gif" in content_type:
                return "gif"
            if "webp" in content_type:
                return "webp"
        if filename:
            ext = filename.lower().split(".")[-1] if "." in filename else ""
            if ext in ("jpg", "jpeg"):
                return "jpeg"
            if ext == "png":
                return "png"
            if ext == "gif":
                return "gif"
            if ext == "webp":
                return "webp"
        return "png"

    async def analyze_diagram(
        self,
        image_path: Optional[str] = None,
        image_data: Optional[bytes] = None,
        context: Optional[str] = None,
        content_type: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze an architecture diagram or screenshot
        
        Args:
            image_path: Path to image file (PNG, JPG)
            image_data: Raw image bytes (alternative to image_path)
            context: Optional context about what to look for
            
        Returns:
            Analysis results with security findings, configuration issues, and recommendations
        """
        start_time = time.time()
        
        try:
            # Load image data
            if image_path:
                image_data = self._load_image(image_path)
            elif not image_data:
                raise ValueError("Either image_path or image_data must be provided")
            
            logger.info(f"Analyzing diagram (size: {len(image_data)} bytes)")
            
            # Construct prompt for Nova Pro
            system_context = """You are a cloud security expert analyzing architecture diagrams and infrastructure screenshots.
Your task is to:
1. Identify security vulnerabilities and misconfigurations
2. Detect configuration drift from best practices
3. Find exposed resources, open ports, and insecure connections
4. Recommend security improvements
5. Assess compliance with AWS security best practices

Provide your analysis in JSON format with:
- security_findings: List of security issues found
- configuration_drift: Items that deviate from best practices
- exposed_resources: Resources accessible from the internet
- recommendations: Specific actionable recommendations
- risk_level: Overall risk assessment (LOW, MEDIUM, HIGH, CRITICAL)
- compliance_issues: AWS best practice violations"""
            
            user_prompt = f"""Analyze this architecture diagram and identify all security issues, configuration drift, and compliance problems.

{context if context else 'Focus on common AWS security issues like exposed databases, open security groups, missing encryption, and privilege escalation risks.'}

Provide a detailed analysis in JSON format."""
            
            image_format = self._image_format_from_content_type(content_type, filename or image_path)
            response = await self.bedrock.invoke_nova_pro(
                prompt=f"{system_context}\n\n{user_prompt}",
                image_data=image_data,
                image_format=image_format,
                max_tokens=4000,
                temperature=0.25
            )
            
            analysis_text = response.get("text", "")
            
            # Try to parse JSON from response
            analysis = self._parse_analysis(analysis_text)
            
            analysis_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Diagram analysis complete in {analysis_time}ms (risk: {analysis.get('risk_level', 'UNKNOWN')})")
            
            return {
                **analysis,
                "analysis_time_ms": analysis_time,
                "model_used": "amazon.nova-pro-v1:0",
                "image_size_bytes": len(image_data)
            }
            
        except Exception as e:
            logger.error(f"Error in diagram analysis: {e}")
            raise
    
    async def detect_configuration_drift(
        self,
        image_path: Optional[str] = None,
        image_data: Optional[bytes] = None,
        expected_config: Optional[Dict[str, Any]] = None,
        content_type: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Detect configuration drift by comparing diagram to expected configuration
        
        Args:
            image_path: Path to current architecture diagram
            image_data: Raw image bytes
            expected_config: Expected configuration (optional)
            
        Returns:
            Drift analysis with differences and recommendations
        """
        start_time = time.time()
        
        try:
            if image_path:
                image_data = self._load_image(image_path)
            elif not image_data:
                raise ValueError("Either image_path or image_data must be provided")
            
            logger.info("Detecting configuration drift")
            
            expected_context = ""
            if expected_config:
                expected_context = f"\n\nExpected configuration:\n{json.dumps(expected_config, indent=2)}"
            
            prompt = f"""Analyze this architecture diagram and identify any configuration drift from AWS security best practices.

Look for:
- Security groups with overly permissive rules
- Resources exposed to the internet unnecessarily
- Missing encryption configurations
- IAM roles with excessive permissions
- Network misconfigurations
- Compliance violations

{expected_context}

Provide findings in JSON format with:
- drift_items: List of configuration drift issues
- severity: Severity level for each item
- recommendations: How to fix each issue"""
            
            image_format = self._image_format_from_content_type(content_type, filename or image_path)
            response = await self.bedrock.invoke_nova_pro(
                prompt=prompt,
                image_data=image_data,
                image_format=image_format,
                max_tokens=3000,
                temperature=0.25
            )

            analysis_text = response.get("text", "")
            drift_analysis = self._parse_analysis(analysis_text)
            
            analysis_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Drift detection complete in {analysis_time}ms")
            
            return {
                **drift_analysis,
                "analysis_time_ms": analysis_time,
                "model_used": "amazon.nova-pro-v1:0"
            }
            
        except Exception as e:
            logger.error(f"Error in drift detection: {e}")
            raise
    
    def _load_image(self, image_path: str) -> bytes:
        """Load image file and return as bytes"""
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        with open(path, 'rb') as f:
            return f.read()
    
    def _parse_analysis(self, text: str) -> Dict[str, Any]:
        """Parse analysis text and extract JSON if present"""
        try:
            # Try to find JSON in the response
            # Look for JSON code blocks
            if "```json" in text:
                json_start = text.find("```json") + 7
                json_end = text.find("```", json_start)
                json_text = text[json_start:json_end].strip()
            elif "```" in text:
                json_start = text.find("```") + 3
                json_end = text.find("```", json_start)
                json_text = text[json_start:json_end].strip()
            else:
                # Try to find JSON object directly
                json_start = text.find("{")
                json_end = text.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_text = text[json_start:json_end]
                else:
                    raise ValueError("No JSON found in response")
            
            return json.loads(json_text)
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Could not parse JSON from response: {e}")
            logger.debug(f"Response text: {text[:500]}")
            
            # Return structured response even if JSON parsing fails
            return {
                "raw_analysis": text,
                "security_findings": [],
                "configuration_drift": [],
                "exposed_resources": [],
                "recommendations": [],
                "risk_level": "UNKNOWN",
                "compliance_issues": []
            }
