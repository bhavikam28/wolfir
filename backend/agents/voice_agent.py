"""
Voice Agent — Aria, powered by Amazon Nova

Dual-model architecture:
- Nova 2 Lite (amazon.nova-2-lite-v1:0): Text-based NLU and response generation
  Used when the frontend sends transcribed text (via Web Speech API STT).
  
- Nova 2 Sonic (amazon.nova-2-sonic-v1:0): Speech-to-speech processing
  Used when the frontend sends raw audio bytes.
  Nova Sonic accepts SPEECH input only and returns SPEECH + TEXT output.
  This requires actual audio data — it cannot process text input.

Voice Pipeline:
  Path A (Text Query — most common):
    1. User speaks → Web Speech API (browser) transcribes to text
    2. Text sent to backend → Nova 2 Lite processes the security query
    3. Response returned → Web Speech API (browser) speaks the response

  Path B (Audio Query — Nova Sonic):
    1. User speaks → MediaRecorder (browser) captures raw audio
    2. Audio sent to backend → Nova 2 Sonic processes speech directly
    3. Audio + text response returned → browser plays audio response
"""
import json
import time
import base64
from typing import Dict, Any, Optional

from services.bedrock_service import BedrockService
from utils.logger import logger


class VoiceAgent:
    """
    Aria — Nova Sentinel's AI security intelligence assistant.
    
    Supports two processing paths:
    - process_voice_query(): Text input → Nova 2 Lite → text response
    - process_audio_query(): Audio input → Nova 2 Sonic → audio + text response
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
    
    # ================================================================
    # PATH A: Text-based queries (Nova 2 Lite)
    # ================================================================
    
    async def process_voice_query(
        self,
        query_text: str,
        incident_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a text-based voice query about security incidents.
        
        Uses Nova 2 Lite for security-aware NLU and response generation.
        The browser handles STT (transcription) and TTS (speech synthesis).
        
        Args:
            query_text: The transcribed voice query (text from Web Speech API)
            incident_context: Optional current incident data for context
            
        Returns:
            AI response with text answer, action suggestions, and metadata
        """
        start_time = time.time()
        
        try:
            logger.info(f"Aria processing text query via Nova 2 Lite: {query_text[:100]}...")
            
            # Build context from current incident
            context_str = self._build_context_string(incident_context)
            
            prompt = self._build_aria_prompt(query_text, context_str)
            
            # Use Nova 2 Lite for NLU and response generation
            # Nova Sonic only accepts SPEECH input, so text queries use Nova Lite
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=1000,
                temperature=0.3
            )
            
            response_text = response.get("text", "")
            result = self._parse_json_response(response_text)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Aria text response in {processing_time}ms: action={result.get('action', 'none')}")
            
            return {
                **result,
                "processing_time_ms": processing_time,
                "nlu_model": self.bedrock.settings.nova_lite_model_id,
                "pipeline": "text-to-text",
                "query": query_text,
                "has_context": bool(incident_context),
                "agent": "aria"
            }
            
        except Exception as e:
            logger.error(f"Aria text query error: {e}")
            return {
                "response_text": "I encountered an error processing your query. Please try again.",
                "action": "none",
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "nlu_model": self.bedrock.settings.nova_lite_model_id,
                "pipeline": "text-to-text",
                "error": str(e)
            }
    
    # ================================================================
    # PATH B: Audio-based queries (Nova 2 Sonic)
    # ================================================================
    
    async def process_audio_query(
        self,
        audio_bytes: bytes,
        audio_format: str = "wav",
        incident_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process raw audio input using Nova 2 Sonic (speech-to-speech).
        
        Nova 2 Sonic (amazon.nova-2-sonic-v1:0) is a speech foundation model
        that accepts SPEECH input and returns SPEECH + TEXT output.
        
        If Nova Sonic fails (e.g., unsupported audio format, API limitations),
        falls back to Nova Lite for text processing.
        
        Args:
            audio_bytes: Raw audio data from the browser MediaRecorder
            audio_format: Audio format (wav, pcm, webm, etc.)
            incident_context: Optional incident context
            
        Returns:
            Response with text, optional audio response, and model metadata
        """
        start_time = time.time()
        
        try:
            logger.info(f"Aria processing audio query via Nova 2 Sonic: "
                        f"{len(audio_bytes)} bytes, format={audio_format}")
            
            # Build system prompt with incident context
            context_str = self._build_context_string(incident_context)
            system_prompt = (
                "You are Aria, Nova Sentinel's AI security intelligence assistant. "
                "You help security teams investigate and respond to AWS cloud security incidents. "
                "Be concise, actionable, and professional. "
                f"{context_str}"
            ) if context_str else (
                "You are Aria, Nova Sentinel's AI security intelligence assistant. "
                "You help security teams investigate and respond to AWS cloud security incidents. "
                "Be concise, actionable, and professional."
            )
            
            # Attempt Nova 2 Sonic (speech-to-speech)
            sonic_response = await self.bedrock.invoke_nova_sonic(
                audio_bytes=audio_bytes,
                audio_format=audio_format,
                system_prompt=system_prompt,
                max_tokens=1000,
                temperature=0.3
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Check if Sonic returned an error (fallback needed)
            # Nova 2 Sonic uses WebSocket bidirectional streaming; Converse API may not support audio
            if sonic_response.get("error") and sonic_response.get("fallback_available"):
                logger.warning(f"Nova Sonic error: {sonic_response['error']}. "
                               "Audio path unavailable — user should use text input.")
                
                return {
                    "response_text": "Audio input via Nova 2 Sonic isn't available in this setup (requires WebSocket streaming). "
                                     "Please type your question or use your browser's speech-to-text — I'll respond via Nova 2 Lite.",
                    "action": "none",
                    "processing_time_ms": processing_time,
                    "nlu_model": self.bedrock.settings.nova_sonic_model_id,
                    "pipeline": "speech-to-speech (fallback)",
                    "sonic_error": sonic_response["error"],
                    "has_audio_response": False,
                    "agent": "aria"
                }
            
            # Nova Sonic success
            response_text = sonic_response.get("text", "")
            
            result = {
                "response_text": response_text,
                "action": "none",
                "processing_time_ms": processing_time,
                "nlu_model": self.bedrock.settings.nova_sonic_model_id,
                "pipeline": "speech-to-speech",
                "has_audio_response": sonic_response.get("has_audio_response", False),
                "agent": "aria",
                "usage": sonic_response.get("usage", {}),
            }
            
            # Include audio response if available
            if sonic_response.get("audio_response_b64"):
                result["audio_response_b64"] = sonic_response["audio_response_b64"]
                result["audio_response_size"] = sonic_response.get("audio_response_size", 0)
            
            logger.info(f"Aria audio response via Nova Sonic in {processing_time}ms")
            return result
            
        except Exception as e:
            logger.error(f"Aria audio query error: {e}")
            return {
                "response_text": "I encountered an error processing your audio. Please try text input.",
                "action": "none",
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "nlu_model": self.bedrock.settings.nova_sonic_model_id,
                "pipeline": "speech-to-speech (error)",
                "error": str(e),
                "has_audio_response": False,
                "agent": "aria"
            }
    
    # ================================================================
    # SHARED: Voice summary generation
    # ================================================================
    
    async def generate_voice_summary(
        self,
        incident_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a spoken summary of incident analysis results.
        Uses Nova 2 Lite for text generation (browser TTS handles speech output).
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
                "model_used": self.bedrock.settings.nova_lite_model_id,
                "event_count": len(events)
            }
            
        except Exception as e:
            logger.error(f"Error generating voice summary: {e}")
            return {
                "summary_text": "Unable to generate voice summary at this time.",
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "error": str(e)
            }
    
    # ================================================================
    # SHARED: Voice command processing
    # ================================================================
    
    async def process_voice_command(
        self,
        command_text: str
    ) -> Dict[str, Any]:
        """
        Process a voice command and determine the action.
        Uses Nova 2 Lite for intent detection (fast text classification).
        """
        try:
            logger.info(f"Processing voice command via Nova 2 Lite: {command_text}")
            
            prompt = f"""You are Aria, a voice command processor for Nova Sentinel security platform.
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
            result = self._parse_json_response(response_text)
            
            if "intent" not in result:
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
    
    # ================================================================
    # PRIVATE: Helper methods
    # ================================================================
    
    def _build_context_string(self, incident_context: Optional[Dict[str, Any]]) -> str:
        """Build a context string from incident data."""
        context_str = ""
        if not incident_context:
            return context_str
        
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
        
        return context_str
    
    def _build_aria_prompt(self, query_text: str, context_str: str) -> str:
        """Build the Aria system prompt for text-based queries."""
        return f"""You are Aria, Nova Sentinel's AI security intelligence assistant.
You are a knowledgeable, professional, and approachable female AI assistant who helps security teams investigate and respond to AWS cloud security incidents through natural conversation.

Your personality:
- Confident and clear communicator
- Explains complex security concepts in accessible language
- Proactive with actionable recommendations
- Warm but professional tone

Your capabilities:
- Explain attack patterns, attack paths, and their implications
- Summarize incident timelines and event chains
- Recommend remediation actions with specific AWS CLI commands
- Explain compliance impacts (CIS, NIST, SOC 2, PCI-DSS)
- Estimate cost impacts of security incidents
- Walk users through visual diagrams and architecture analysis
- Answer questions about AWS security best practices

{f"CURRENT INCIDENT CONTEXT:{context_str}" if context_str else "No active incident context."}

USER QUERY: "{query_text}"

Respond naturally and concisely (2-4 sentences for simple questions, more for complex ones).
If the user asks about attack path graphs/diagrams, explain the attack chain step by step.
If the query is a command (like "analyze", "remediate", "show timeline"), identify the action.
Never say you cannot help — always provide the best answer you can from available context.

Return a JSON response:
{{
    "response_text": "Your natural language response to the user",
    "action": "none|analyze|remediate|explain|summarize|compliance|cost",
    "action_target": "what the action should be applied to (if applicable)",
    "severity_assessment": "critical|high|medium|low|info",
    "follow_up_suggestions": ["suggestion 1", "suggestion 2"]
}}"""
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON from a model response."""
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
            
            return json.loads(json_text)
        except (json.JSONDecodeError, ValueError):
            return {
                "response_text": response_text,
                "action": "none",
                "action_target": None,
                "severity_assessment": "info",
                "follow_up_suggestions": []
            }