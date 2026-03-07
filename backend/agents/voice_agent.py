"""
Voice Agent — Aria, powered by Amazon Nova

Current implementation:
- Nova 2 Lite: NLU and response generation for all queries (text and audio fallback)
- Browser Web Speech API: STT (speech-to-text) and TTS (speech synthesis)
- Aria uses Nova 2 Lite for NLU with browser-side speech synthesis.

Nova 2 Sonic: Integration-ready but requires bidirectional WebSocket streaming.
Nova Sonic uses WebSocket, not the Converse API — audio input via Converse would fail
with ValidationException. When WebSocket client is available, Path B (audio→Sonic→audio)
can be enabled.

Voice Pipeline:
  Path A (Text Query — primary):
    1. User speaks → Web Speech API (browser) transcribes to text
    2. Text sent to backend → Nova 2 Lite processes the security query
    3. Response returned → Web Speech API (browser) speaks the response

  Path B (Audio Query): Returns helpful fallback — use text input or browser STT.
"""
import json
import time
import base64
from typing import Dict, Any, Optional

from services.bedrock_service import BedrockService
from services.incident_memory import get_incident_memory
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
        incident_context: Optional[Dict[str, Any]] = None,
        account_id: str = "demo-account",
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
            # Inject incident memory (past incidents + correlation) for Aria
            if incident_context:
                memory_ctx = await self._get_memory_context(incident_context, account_id)
                if memory_ctx:
                    context_str = f"{memory_ctx}\n\n{context_str}" if context_str else memory_ctx
            
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
        incident_context: Optional[Dict[str, Any]] = None,
        account_id: str = "demo-account",
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
            if incident_context:
                memory_ctx = await self._get_memory_context(incident_context, account_id)
                if memory_ctx:
                    context_str = f"{memory_ctx}\n\n{context_str}" if context_str else memory_ctx
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
            
            # Nova 2 Sonic requires bidirectional WebSocket streaming — Converse API
            # does not support audio content blocks and would fail with ValidationException.
            # Skip the API call and return transparent fallback. Sonic is integration-ready
            # for when WebSocket streaming client is implemented.
            sonic_response = {
                "error": "Nova 2 Sonic requires WebSocket streaming (not Converse API). "
                         "Use text input or browser speech-to-text — Aria responds via Nova 2 Lite.",
                "fallback_available": True,
            }
            
            processing_time = int((time.time() - start_time) * 1000)
            
            if sonic_response.get("error") and sonic_response.get("fallback_available"):
                logger.warning(f"Nova Sonic error: {sonic_response['error']}. "
                               "Audio path unavailable — user should use text input.")
                
                return {
                    "response_text": "Audio input via Nova 2 Sonic requires WebSocket streaming (integration-ready, not yet wired). "
                                     "Please type your question or use the microphone with speech-to-text — I'll respond via Nova 2 Lite.",
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
    
    async def _get_memory_context(self, incident_context: Dict[str, Any], account_id: str) -> Optional[str]:
        """Fetch incident memory context (past incidents + correlation) for Aria's prompt."""
        try:
            memory = get_incident_memory()
            current = {
                "incident_id": incident_context.get("incident_id", "current"),
                "results": {
                    "timeline": incident_context.get("timeline"),
                    "risk_scores": incident_context.get("risk_scores", []),
                },
                "metadata": {"incident_type": incident_context.get("incident_type", "Unknown")},
                "timeline": incident_context.get("timeline"),
            }
            return await memory.get_correlation_context_for_aria(account_id, current)
        except Exception as e:
            logger.warning(f"Incident memory context unavailable: {e}")
            return None
    
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
    "follow_up_suggestions": ["What compliance frameworks are affected?", "What is the cost impact?", "Have we seen this attack pattern before?"]
}}

IMPORTANT: Always include 2-3 contextual follow_up_suggestions — short, clickable questions the user might ask next (e.g., "What compliance frameworks are affected?", "Explain the remediation steps", "What is the cost impact?"). Tailor suggestions to the current incident context.

Return ONLY valid JSON, no additional text before or after."""
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON from a model response. Robust extraction like temporal_agent."""
        try:
            json_text = None
            # First, try code blocks
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                if json_end > json_start:
                    json_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                if json_end > json_start:
                    json_text = response_text[json_start:json_end].strip()
            # Fallback: find first { and last }
            if not json_text and "{" in response_text:
                start_idx = response_text.find("{")
                end_idx = response_text.rfind("}") + 1
                if end_idx > start_idx:
                    json_text = response_text[start_idx:end_idx]
            if not json_text:
                json_text = "{}"
            
            result = json.loads(json_text)
            # Ensure follow_up_suggestions exists and is a list
            if "follow_up_suggestions" not in result or not isinstance(result["follow_up_suggestions"], list):
                result["follow_up_suggestions"] = result.get("follow_up_suggestions") or []
            return result
        except (json.JSONDecodeError, ValueError):
            return {
                "response_text": response_text,
                "action": "none",
                "action_target": None,
                "severity_assessment": "info",
                "follow_up_suggestions": [
                    "What compliance frameworks are affected?",
                    "Explain the remediation steps",
                    "What is the cost impact?",
                ],
            }