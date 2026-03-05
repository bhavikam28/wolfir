"""
Temporal Agent - Nova 2 Lite powered timeline analysis
"""
import json
import time
from typing import List, Dict, Any
from datetime import datetime

from services.bedrock_service import BedrockService
from models.incident import Timeline, TimelineEvent, SeverityLevel
from utils.prompts import (
    TIMELINE_ANALYSIS_SYSTEM_PROMPT,
    TIMELINE_ANALYSIS_PROMPT
)
from utils.event_filter import filter_interesting_events
from utils.logger import logger


class TemporalAgent:
    """
    Agent responsible for temporal analysis of CloudTrail events
    using Nova 2 Lite for reasoning and root cause analysis
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
        
    MAX_EVENTS_FOR_ANALYSIS = 50  # Under Nova 2 Lite token limits; supports multi-region fetch

    async def analyze_timeline(
        self,
        events: List[Dict[str, Any]],
        incident_type: str = "Unknown"
    ) -> Timeline:
        """
        Analyze CloudTrail events and build incident timeline
        
        Args:
            events: List of CloudTrail events
            incident_type: Type of security incident
            
        Returns:
            Timeline object with analyzed events and insights
        """
        start_time = time.time()

        try:
            # Pre-filter routine events (PutLogEvents, AssumeRole from AWS services, etc.)
            # to avoid hallucinated incident narratives from mundane activity
            events = filter_interesting_events(events)
            if len(events) == 0:
                logger.info("All events filtered as routine — returning no-threat timeline")
                return Timeline(
                    events=[],
                    root_cause="No threat detected",
                    attack_pattern="N/A - routine activity only",
                    blast_radius="None",
                    confidence=0.95,
                    analysis_summary="All CloudTrail events were routine operations (logging, service churn, AWS service AssumeRole). No security-relevant activity detected."
                )

            # Truncate to fit context window — avoid ValidationException from oversized input
            if len(events) > self.MAX_EVENTS_FOR_ANALYSIS:
                logger.warning(f"Truncating {len(events)} events to {self.MAX_EVENTS_FOR_ANALYSIS}")
                events = events[:self.MAX_EVENTS_FOR_ANALYSIS]

            # Strip verbose fields to reduce token count
            trimmed_events = []
            for event in events:
                ui = event.get("userIdentity", event.get("user", {}))
                if isinstance(ui, dict):
                    ui = {"type": ui.get("type", ""), "arn": ui.get("arn", ""), "userName": ui.get("userName", ui.get("user_name", ""))}
                trimmed = {
                    "eventTime": event.get("eventTime", event.get("event_time", event.get("EventTime", ""))),
                    "eventName": event.get("eventName", event.get("event_name", event.get("EventName", ""))),
                    "sourceIPAddress": event.get("sourceIPAddress", event.get("source_ip", "")),
                    "awsRegion": event.get("awsRegion", event.get("aws_region", "")),
                    "userIdentity": ui,
                    "requestParameters": event.get("requestParameters", event.get("request_parameters", {})),
                    "errorCode": event.get("errorCode", event.get("error_code")),
                }
                trimmed_events.append(trimmed)

            logger.info(f"Starting temporal analysis of {len(trimmed_events)} events")
            if trimmed_events:
                logger.debug(f"First event sample: {json.dumps(trimmed_events[0], indent=2, default=str)[:300]}")

            # Format events for the prompt
            events_json = json.dumps(trimmed_events, indent=2, default=str)
            logger.debug(f"Events JSON length: {len(events_json)} chars")
            
            # Construct the prompt
            prompt = TIMELINE_ANALYSIS_PROMPT.format(events=events_json)
            logger.debug(f"Prompt length: {len(prompt)} chars")
            
            # Invoke Nova 2 Lite for reasoning
            logger.info("Invoking Nova 2 Lite for timeline analysis")
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                system_prompt=TIMELINE_ANALYSIS_SYSTEM_PROMPT,
                max_tokens=8000,
                temperature=0.2
            )
            
            response_text = response.get('text', '')
            logger.info(f"Nova 2 Lite response received. Text length: {len(response_text)} chars")
            logger.debug(f"Response preview: {response_text[:500]}")
            
            # Parse the response
            analysis = self._parse_analysis_response(response_text)
            logger.info(f"Parsed analysis: timeline events={len(analysis.get('timeline', []))}, root_cause={bool(analysis.get('root_cause'))}")

            # No-threat path: if Nova indicates routine activity, trust it and avoid fallback fabrication
            root_cause = str(analysis.get('root_cause', ''))
            root_lower = root_cause.lower()
            confidence = float(analysis.get('confidence', 0.5))
            event_count = len(trimmed_events)

            # Explicit no-threat keywords
            is_no_threat = (
                confidence < 0.5
                or 'no security threats' in root_lower
                or 'routine' in root_lower
                or 'no threat' in root_lower
                or 'no external threat detected' in root_lower
            )
            # Hedging language = Nova unsure, likely routine (e.g. "could be legitimate admin—verify")
            has_hedging = (
                'legitimate' in root_lower or 'verify with stakeholders' in root_lower
                or 'could be' in root_lower or 'alternatively' in root_lower
                or 'account owner' in root_lower or 'admin maintenance' in root_lower
            )
            # Few events + hedging = cap confidence, treat as low-threat
            few_events_routine = event_count <= 10 and has_hedging and confidence > 0.5

            if is_no_threat and not analysis.get('timeline'):
                analysis["timeline"] = []
                analysis["root_cause"] = analysis.get("root_cause") or "No security threats detected — routine AWS operations."
                analysis["attack_pattern"] = "N/A - routine activity only"
                analysis["blast_radius"] = "None"
                analysis["confidence"] = min(confidence, 0.3)
            elif few_events_routine:
                # Nova hedged — cap confidence; low event count + hedging = likely routine
                analysis["confidence"] = min(confidence, 0.4)
            
            # Build Timeline object
            timeline_events_data = analysis.get('timeline', [])
            logger.info(f"Building timeline from {len(timeline_events_data)} parsed events")
            
            built_events = self._build_timeline_events(timeline_events_data)
            logger.info(f"Built {len(built_events)} TimelineEvent objects")

            # Fallback: If Nova didn't return events, build from raw — but NOT when no-threat
            # (fallback would fabricate incident narrative from routine events)
            if len(built_events) == 0 and len(trimmed_events) > 0 and not is_no_threat:
                logger.warning("Nova returned no timeline events, building fallback timeline from raw CloudTrail events")
                built_events = self._build_fallback_timeline(trimmed_events)
                logger.info(f"Built {len(built_events)} fallback TimelineEvent objects from raw events")
            
            timeline = Timeline(
                events=built_events,
                root_cause=analysis.get('root_cause', 'Analysis incomplete'),
                attack_pattern=analysis.get('attack_pattern', 'Unknown'),
                blast_radius=analysis.get('blast_radius', 'Unknown'),
                confidence=float(analysis.get('confidence', 0.5)),
                analysis_summary=analysis.get('analysis_summary', 'Timeline analysis completed')
            )
            
            analysis_time = int((time.time() - start_time) * 1000)
            logger.info(f"Temporal analysis complete in {analysis_time}ms: {len(built_events)} events, confidence={timeline.confidence}")
            
            return timeline
            
        except Exception as e:
            logger.error(f"Error in temporal analysis: {e}")
            raise
    
    def _parse_analysis_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse Nova 2 Lite response into structured format
        
        Args:
            response_text: Raw text response from model
            
        Returns:
            Parsed analysis dictionary
        """
        logger.info(f"Parsing Nova 2 Lite response (length: {len(response_text)} chars)")
        logger.debug(f"Response preview: {response_text[:300]}")
        
        try:
            # Try to extract JSON from response
            # Handle cases where model might add explanation text or code blocks
            json_str = None
            
            # First, try to find JSON in code blocks
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                if json_end > json_start:
                    json_str = response_text[json_start:json_end].strip()
                    logger.info("Found JSON in ```json code block")
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                if json_end > json_start:
                    json_str = response_text[json_start:json_end].strip()
                    logger.info("Found JSON in ``` code block")
            
            # If no code block, try to find JSON object
            if not json_str:
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}') + 1
                
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = response_text[start_idx:end_idx]
                    logger.info("Found JSON object in response text")
                else:
                    logger.warning("No JSON object found in response")
                    raise ValueError("No JSON found in response")
            
            # Parse the JSON
            parsed = json.loads(json_str)
            logger.info(f"Successfully parsed JSON. Keys: {list(parsed.keys())}")
            
            # Validate required fields
            if "timeline" not in parsed:
                logger.warning("Response missing 'timeline' field, adding empty array")
                parsed["timeline"] = []
            if "root_cause" not in parsed:
                logger.warning("Response missing 'root_cause' field")
                parsed["root_cause"] = "Analysis incomplete"
            if "attack_pattern" not in parsed:
                logger.warning("Response missing 'attack_pattern' field")
                parsed["attack_pattern"] = "Unknown"
            if "blast_radius" not in parsed:
                logger.warning("Response missing 'blast_radius' field")
                parsed["blast_radius"] = "Unknown"
            if "confidence" not in parsed:
                logger.warning("Response missing 'confidence' field, defaulting to 0.5")
                parsed["confidence"] = 0.5
                
            return parsed
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Nova 2 Lite response as JSON: {e}")
            logger.error(f"JSON string (first 500 chars): {json_str[:500] if json_str else 'None'}")
            logger.error(f"Full response (first 1000 chars): {response_text[:1000]}")
            
            # Return a basic structure if parsing fails
            return {
                "timeline": [],
                "root_cause": "Failed to parse analysis - JSON decode error",
                "attack_pattern": "Unknown",
                "blast_radius": "Unknown",
                "confidence": 0.5,
                "analysis_summary": response_text[:200] if response_text else "No response received"
            }
        except Exception as e:
            logger.error(f"Unexpected error parsing response: {e}")
            logger.error(f"Response text (first 500 chars): {response_text[:500]}")
            
            return {
                "timeline": [],
                "root_cause": f"Failed to parse analysis - {str(e)}",
                "attack_pattern": "Unknown",
                "blast_radius": "Unknown",
                "confidence": 0.5,
                "analysis_summary": response_text[:200] if response_text else "No response received"
            }
    
    def _build_timeline_events(
        self,
        events_data: List[Dict[str, Any]]
    ) -> List[TimelineEvent]:
        """
        Convert parsed event data into TimelineEvent objects
        
        Args:
            events_data: List of event dictionaries from analysis
            
        Returns:
            List of TimelineEvent objects
        """
        timeline_events = []
        
        for event_data in events_data:
            try:
                # Parse timestamp
                timestamp_str = event_data.get('timestamp', '')
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    timestamp = datetime.now()
                
                # Parse severity
                severity_str = event_data.get('severity', 'MEDIUM').upper()
                try:
                    severity = SeverityLevel[severity_str]
                except KeyError:
                    severity = SeverityLevel.MEDIUM
                
                # Create TimelineEvent
                event = TimelineEvent(
                    timestamp=timestamp,
                    actor=event_data.get('actor', 'Unknown'),
                    action=event_data.get('action', 'Unknown'),
                    resource=event_data.get('resource', 'Unknown'),
                    details=event_data.get('details'),
                    significance=event_data.get('significance'),
                    severity=severity
                )
                
                timeline_events.append(event)
                
            except Exception as e:
                logger.warning(f"Failed to parse timeline event: {e}")
                continue
        
        return timeline_events
    
    def _build_fallback_timeline(self, cloudtrail_events: List[Dict[str, Any]]) -> List[TimelineEvent]:
        """
        Build a basic timeline directly from CloudTrail events when Nova parsing fails
        
        Args:
            cloudtrail_events: Raw CloudTrail events
            
        Returns:
            List of TimelineEvent objects
        """
        timeline_events = []
        
        logger.info(f"Building fallback timeline from {len(cloudtrail_events)} CloudTrail events")
        
        for idx, event in enumerate(cloudtrail_events):
            try:
                # Extract timestamp
                event_time_str = event.get('eventTime', '')
                try:
                    if event_time_str:
                        timestamp = datetime.fromisoformat(event_time_str.replace('Z', '+00:00'))
                    else:
                        timestamp = datetime.now()
                except (ValueError, AttributeError):
                    timestamp = datetime.now()
                
                # Extract actor
                user_identity = event.get('userIdentity', {})
                if isinstance(user_identity, dict):
                    actor = user_identity.get('userName') or user_identity.get('arn') or user_identity.get('type', 'Unknown')
                else:
                    actor = 'Unknown'
                
                # Extract action
                action = event.get('eventName', 'Unknown')
                
                # Extract resource
                resource = 'Unknown'
                request_params = event.get('requestParameters', {})
                if request_params:
                    # Try to extract resource identifier
                    if 'bucketName' in request_params:
                        resource = f"S3 Bucket: {request_params.get('bucketName')}"
                    elif 'roleName' in request_params:
                        resource = f"IAM Role: {request_params.get('roleName')}"
                    elif 'instanceIds' in request_params:
                        resource = f"EC2 Instances: {request_params.get('instanceIds')}"
                    elif 'groupId' in request_params:
                        resource = f"Security Group: {request_params.get('groupId')}"
                    else:
                        resource = str(request_params)[:100]
                
                # Determine severity based on event type
                severity = SeverityLevel.MEDIUM
                action_lower = action.lower()
                if any(keyword in action_lower for keyword in ['create', 'delete', 'modify', 'attach', 'detach']):
                    severity = SeverityLevel.HIGH
                if any(keyword in action_lower for keyword in ['assumerole', 'createaccesskey', 'putuserpolicy']):
                    severity = SeverityLevel.CRITICAL
                
                # Create TimelineEvent
                timeline_event = TimelineEvent(
                    timestamp=timestamp,
                    actor=str(actor),
                    action=action,
                    resource=resource,
                    details=f"Event from {event.get('awsRegion', 'unknown')} region",
                    significance=f"CloudTrail event: {action}",
                    severity=severity
                )
                
                timeline_events.append(timeline_event)
                logger.debug(f"Created fallback event: {action} by {actor}")
                
            except Exception as e:
                logger.error(f"Failed to build fallback event {idx + 1}: {e}")
                continue
        
        logger.info(f"Successfully built {len(timeline_events)} fallback timeline events")
        return timeline_events
    
    async def identify_blast_radius(
        self,
        compromised_role: str,
        events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Identify all resources affected by a compromised role
        
        Args:
            compromised_role: ARN or name of compromised role
            events: All CloudTrail events
            
        Returns:
            Dictionary with affected resources and count
        """
        affected_resources = set()
        affected_actions = []
        
        for event in events:
            user_identity = event.get('userIdentity', {})
            
            # Check if this event was performed by the compromised role
            if compromised_role in str(user_identity.get('arn', '')):
                # Extract affected resources
                if 'resources' in event:
                    for resource in event['resources']:
                        if 'arn' in resource:
                            affected_resources.add(resource['arn'])
                
                affected_actions.append({
                    'eventName': event.get('eventName'),
                    'eventTime': event.get('eventTime'),
                    'resource': event.get('requestParameters', {})
                })
        
        return {
            'total_affected': len(affected_resources),
            'resources': list(affected_resources),
            'actions_count': len(affected_actions),
            'sample_actions': affected_actions[:10]
        }
