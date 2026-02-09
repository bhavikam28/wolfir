"""
Voice Agent - Nova 2 Sonic powered voice interaction
Handles voice commands, incident queries, and voice summaries
Uses Nova Sonic for natural language understanding of security queries
"""
import json
import time
from typing import Dict, Any, Optional

from services.bedrock_service import BedrockService
from utils.logger import logger


class VoiceAgent:
    """
    Agent responsible for voice-based security interaction using Nova 2 Sonic.
    
    Capabilities:
    - Process voice commands for incident analysis
    - Answer security questions about current incidents
    - Generate spoken summaries of analysis results
    - Handle natural language remediation commands
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
    
    async def process_voice_query(
        self,
        query_text: str,
        incident_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a voice query about security incidents using Nova Sonic.
        
        Args:
            query_text: The transcribed voice query
            incident_context: Optional current incident data for context
            
        Returns:
            AI response with text answer, action suggestions, and metadata
        """
        start_time = time.time()
        
        try:
            logger.info(f"Processing voice query: {query_text[:100]}...")
            
            # Build context from current incident
            context_str = ""
            if incident_context:
                if incident_context.get("timeline"):
                    tl = incident_context["timeline"]
                    context_str += f"\nCurrent Incident Timeline:\n"
                    context_str += f"- Root Cause: {tl.get('root_cause', 'Unknown')}\n"
                    context_str += f"- Attack Pattern: {tl.get('attack_pattern', 'Unknown')}\n"
                    context_str += f"- Blast Radius: {tl.get('blast_radius', 'Unknown')}\n"
                    context_str += f"- Confidence: {tl.get('confidence', 0)}\n"
                    events = tl.get("events", [])
                    if events:
                        context_str += f"- Events ({len(events)} total):\n"
                        for e in events[:5]:
                            context_str += f"  * [{e.get('severity', 'unknown')}] {e.get('event_name', 'Unknown')} - {e.get('description', '')}\n"
                
                if incident_context.get("remediation_plan"):
                    rp = incident_context["remediation_plan"]
                    steps = rp.get("steps", [])
                    context_str += f"\nRemediation Plan ({len(steps)} steps):\n"
                    for s in steps[:3]:
                        context_str += f"  * {s.get('action', 'Unknown')}\n"
            
            prompt = f"""You are Nova Sentinel's AI Security Assistant, powered by Amazon Nova Sonic.
You help security teams investigate and respond to AWS cloud security incidents through natural conversation.

Your capabilities:
- Explain attack patterns and their implications
- Summarize incident timelines
- Recommend remediation actions
- Explain compliance impacts (CIS, NIST, SOC 2, PCI-DSS)
- Estimate cost impacts of security incidents
- Answer questions about AWS security best practices

{f"CURRENT INCIDENT CONTEXT:{context_str}" if context_str else "No active incident context."}

USER QUERY: "{query_text}"

Respond naturally and concisely (2-4 sentences for simple questions, more for complex ones).
If the query is a command (like "analyze", "remediate", "show timeline"), identify the action.

Return a JSON response:
{{
    "response_text": "Your natural language response to the user",
    "action": "none|analyze|remediate|explain|summarize|compliance|cost",
    "action_target": "what the action should be applied to (if applicable)",
    "severity_assessment": "critical|high|medium|low|info",
    "follow_up_suggestions": ["suggestion 1", "suggestion 2"]
}}"""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=1000,
                temperature=0.3
            )
            
            response_text = response.get("text", "")
            
            # Parse JSON response
            try:
                # Extract JSON from response
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
                    "response_text": response_text,
                    "action": "none",
                    "action_target": None,
                    "severity_assessment": "info",
                    "follow_up_suggestions": []
                }
            
            processing_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Voice query processed in {processing_time}ms: action={result.get('action', 'none')}")
            
            return {
                **result,
                "processing_time_ms": processing_time,
                "model_used": "amazon.nova-sonic-v1:0",
                "query": query_text,
                "has_context": bool(incident_context)
            }
            
        except Exception as e:
            logger.error(f"Error processing voice query: {e}")
            return {
                "response_text": f"I encountered an error processing your query. Please try again. Error: {str(e)}",
                "action": "none",
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "model_used": "amazon.nova-sonic-v1:0",
                "error": str(e)
            }
    
    async def generate_voice_summary(
        self,
        incident_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a spoken summary of incident analysis results.
        
        Args:
            incident_data: Complete incident analysis data
            
        Returns:
            Summary text optimized for speech output
        """
        start_time = time.time()
        
        try:
            timeline = incident_data.get("timeline", {})
            events = timeline.get("events", [])
            
            prompt = f"""Generate a concise spoken briefing for a security incident. 
This will be read aloud by a text-to-speech system, so use natural speech patterns.

Incident Details:
- Root Cause: {timeline.get('root_cause', 'Unknown')}
- Attack Pattern: {timeline.get('attack_pattern', 'Unknown')} 
- Blast Radius: {timeline.get('blast_radius', 'Unknown')}
- Confidence: {timeline.get('confidence', 0) * 100:.0f}%
- Total Events: {len(events)}
- Critical Events: {sum(1 for e in events if e.get('severity') == 'critical')}
- High Events: {sum(1 for e in events if e.get('severity') == 'high')}

Generate a 3-4 sentence executive briefing suitable for a security team standup.
Speak naturally — use phrases like "we detected", "the attacker", "I recommend".
Do NOT use markdown formatting, bullet points, or special characters."""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=500,
                temperature=0.3
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return {
                "summary_text": response.get("text", "Unable to generate summary."),
                "processing_time_ms": processing_time,
                "model_used": "amazon.nova-sonic-v1:0",
                "event_count": len(events)
            }
            
        except Exception as e:
            logger.error(f"Error generating voice summary: {e}")
            return {
                "summary_text": "Unable to generate voice summary at this time.",
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "error": str(e)
            }
    
    async def process_voice_command(
        self,
        command_text: str
    ) -> Dict[str, Any]:
        """
        Process a voice command and determine the action.
        
        Args:
            command_text: Transcribed voice command
            
        Returns:
            Command interpretation with action and parameters
        """
        try:
            logger.info(f"Processing voice command: {command_text}")
            
            prompt = f"""You are a voice command processor for Nova Sentinel security platform.
Process the following voice command and determine the user's intent.

Voice Command: "{command_text}"

Available actions:
- analyze: Analyze a security incident or run a demo scenario
- remediate: Generate or show remediation steps
- query: Query incident details or ask a question
- summarize: Get a summary of current analysis
- compliance: Check compliance status
- cost: Show cost impact estimation
- confirm: Confirm an action
- cancel: Cancel an operation

Return JSON with:
{{
    "intent": "The detected intent",
    "action": "The action to take",
    "parameters": {{}},
    "confidence": 0.95,
    "response_text": "Suggested text response to speak back"
}}"""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=500,
                temperature=0.1
            )
            
            response_text = response.get("text", "")
            
            try:
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    json_text = response_text[json_start:json_end].strip()
                else:
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    json_text = response_text[json_start:json_end] if json_start >= 0 else "{}"
                
                result = json.loads(json_text)
            except (json.JSONDecodeError, ValueError):
                result = {
                    "intent": "unknown",
                    "action": "query",
                    "parameters": {},
                    "confidence": 0.5,
                    "response_text": "I didn't understand that command. Try asking about the incident, remediation, or compliance."
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing voice command: {e}")
            raise
