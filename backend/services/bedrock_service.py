"""
Amazon Bedrock service wrapper for Nova models
Supports Nova 2 Lite, Nova Pro, Nova Micro, Nova 2 Sonic, and Nova Canvas

Model capabilities (verified via Bedrock console):
- amazon.nova-2-lite-v1:0  — Input: TEXT,IMAGE,VIDEO | Output: TEXT | Streaming: Yes
- amazon.nova-pro-v1:0     — Input: TEXT,IMAGE,VIDEO | Output: TEXT | Streaming: Yes
- amazon.nova-micro-v1:0   — Input: TEXT            | Output: TEXT | Streaming: Yes
- amazon.nova-2-sonic-v1:0 — Input: SPEECH          | Output: SPEECH,TEXT | Streaming: Yes
- amazon.nova-canvas-v1:0  — Input: TEXT,IMAGE       | Output: IMAGE | Streaming: No
"""
import json
import asyncio
import base64
import boto3
from typing import Dict, Any, Optional, List
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


class BedrockService:
    """Wrapper for Amazon Bedrock Runtime API"""
    _semaphore = None  # Lazy init: asyncio.Semaphore(3)

    def _get_semaphore(self):
        if BedrockService._semaphore is None:
            BedrockService._semaphore = asyncio.Semaphore(3)
        return BedrockService._semaphore

    def __init__(self):
        self.settings = get_settings()
        
        # Create session with profile if specified
        if self.settings.aws_profile and self.settings.aws_profile != "default":
            session = boto3.Session(profile_name=self.settings.aws_profile)
            logger.info(f"Using AWS profile: {self.settings.aws_profile}")
        else:
            session = boto3.Session()
            logger.info("Using default AWS credentials")
        
        self.client = session.client(
            'bedrock-runtime',
            region_name=self.settings.aws_region
        )
        logger.info(f"Bedrock client initialized for region: {self.settings.aws_region}")
        
    async def invoke_nova_lite(
        self,
        prompt: str,
        max_tokens: int = 8000,
        temperature: float = 0.2,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Invoke Nova 2 Lite model for reasoning tasks.
        
        Uses amazon.nova-2-lite-v1:0 — the latest Nova 2 Lite model.
        """
        try:
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"
            else:
                full_prompt = prompt
            
            messages = [{
                "role": "user",
                "content": [{"text": full_prompt}]
            }]
            
            request_body = {
                "messages": messages,
                "inferenceConfig": {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature
                }
            }
            
            logger.info(f"Invoking Nova 2 Lite ({self.settings.nova_lite_model_id})")

            async with self._get_semaphore():
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.client.invoke_model,
                        modelId=self.settings.nova_lite_model_id,
                        contentType="application/json",
                        accept="application/json",
                        body=json.dumps(request_body),
                    ),
                    timeout=60.0,
                )

            response_body = json.loads(response['body'].read())
            
            return {
                "text": response_body['output']['message']['content'][0]['text'],
                "stop_reason": response_body.get('stopReason', 'end_turn'),
                "usage": response_body.get('usage', {})
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error (Nova 2 Lite): {e}")
            raise
        except asyncio.TimeoutError:
            logger.error("Nova 2 Lite request timed out after 60s")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova 2 Lite: {e}")
            raise

    async def invoke_nova_pro(
        self,
        prompt: str,
        image_data: Optional[bytes] = None,
        max_tokens: int = 4000,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Invoke Nova Pro model for multimodal analysis.
        
        Uses amazon.nova-pro-v1:0 — supports text + image input.
        Uses Converse API for multimodal (bytes not JSON-serializable for invoke_model).
        """
        try:
            content = []
            if image_data:
                content.append({
                    "image": {"format": "png", "source": {"bytes": image_data}}
                })
            content.append({"text": prompt})

            logger.info(f"Invoking Nova Pro ({self.settings.nova_pro_model_id}, multimodal: {image_data is not None})")

            # Converse API handles bytes natively — invoke_model + json.dumps would fail
            async with self._get_semaphore():
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.client.converse,
                        modelId=self.settings.nova_pro_model_id,
                        messages=[{"role": "user", "content": content}],
                        inferenceConfig={
                            "maxTokens": max_tokens,
                            "temperature": temperature,
                        },
                    ),
                    timeout=60.0,
                )

            output = response.get("output", {})
            message = output.get("message", {})
            msg_content = message.get("content", [])
            text = msg_content[0].get("text", "") if msg_content else ""

            return {
                "text": text,
                "stop_reason": response.get("stopReason", "end_turn"),
                "usage": response.get("usage", {}),
            }

        except ClientError as e:
            logger.error(f"Bedrock API error (Nova Pro): {e}")
            raise
        except asyncio.TimeoutError:
            logger.error("Nova Pro request timed out after 60s")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova Pro: {e}")
            raise
    
    async def invoke_nova_micro(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.0
    ) -> Dict[str, Any]:
        """
        Invoke Nova Micro model for fast classification.
        
        Uses amazon.nova-micro-v1:0 — ultra-fast, deterministic.
        """
        try:
            request_body = {
                "messages": [{
                    "role": "user",
                    "content": [{"text": prompt}]
                }],
                "inferenceConfig": {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature
                }
            }
            
            logger.info(f"Invoking Nova Micro ({self.settings.nova_micro_model_id})")
            
            response = await asyncio.to_thread(
                self.client.invoke_model,
                modelId=self.settings.nova_micro_model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            
            return {
                "text": response_body['output']['message']['content'][0]['text'],
                "stop_reason": response_body.get('stopReason', 'end_turn'),
                "usage": response_body.get('usage', {})
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error (Nova Micro): {e}")
            raise
        except asyncio.TimeoutError:
            logger.error("Nova Micro request timed out after 60s")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova Micro: {e}")
            raise

    async def invoke_nova_sonic(
        self,
        audio_bytes: bytes,
        audio_format: str = "wav",
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        """
        Attempt Nova 2 Sonic speech-to-speech via Bedrock Converse API.
        
        NOTE: Nova 2 Sonic officially uses bidirectional WebSocket streaming for
        production. The Converse API may not support audio content blocks — if
        this fails (ValidationException), the voice agent returns a helpful
        fallback message asking the user to use text input.
        
        Nova 2 Sonic: Input SPEECH → Output SPEECH + TEXT (us-east-1, ap-northeast-1, etc.)
        
        Args:
            audio_bytes: Raw audio data (WAV, PCM, or supported format)
            audio_format: Audio format identifier (wav, pcm, mp3, etc.)
            system_prompt: Optional system context for the conversation
            max_tokens: Maximum response tokens
            temperature: Response temperature
            
        Returns:
            Dict with text response and optional audio response
        """
        try:
            logger.info(f"Invoking Nova 2 Sonic ({self.settings.nova_sonic_model_id}), "
                        f"audio_format={audio_format}, audio_size={len(audio_bytes)} bytes")
            
            # Build the audio content block for Nova Sonic
            # Nova Sonic accepts SPEECH input via the converse API
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            messages = [{
                "role": "user",
                "content": [{
                    "audio": {
                        "format": audio_format,
                        "source": {
                            "bytes": audio_bytes
                        }
                    }
                }]
            }]
            
            # Build converse request
            converse_params = {
                "modelId": self.settings.nova_sonic_model_id,
                "messages": messages,
                "inferenceConfig": {
                    "maxTokens": max_tokens,
                    "temperature": temperature,
                }
            }
            
            if system_prompt:
                converse_params["system"] = [{"text": system_prompt}]
            
            # Use converse_stream for streaming audio response
            response = await asyncio.to_thread(
                self.client.converse_stream,
                **converse_params
            )
            
            # Collect streaming response
            response_text = ""
            response_audio_chunks = []
            stop_reason = "end_turn"
            usage = {}
            
            stream = response.get("stream", {})
            for event in stream:
                if "contentBlockDelta" in event:
                    delta = event["contentBlockDelta"].get("delta", {})
                    if "text" in delta:
                        response_text += delta["text"]
                    if "audio" in delta:
                        audio_chunk = delta["audio"].get("bytes", b"")
                        if audio_chunk:
                            response_audio_chunks.append(audio_chunk)
                elif "messageStop" in event:
                    stop_reason = event["messageStop"].get("stopReason", "end_turn")
                elif "metadata" in event:
                    usage = event["metadata"].get("usage", {})
            
            # Combine audio chunks if present
            response_audio = b"".join(response_audio_chunks) if response_audio_chunks else None
            
            result = {
                "text": response_text,
                "stop_reason": stop_reason,
                "usage": usage,
                "model_used": self.settings.nova_sonic_model_id,
                "has_audio_response": response_audio is not None,
            }
            
            if response_audio:
                result["audio_response_b64"] = base64.b64encode(response_audio).decode('utf-8')
                result["audio_response_size"] = len(response_audio)
            
            logger.info(f"Nova 2 Sonic response: {len(response_text)} chars text, "
                        f"{len(response_audio_chunks)} audio chunks")
            
            return result
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"Bedrock API error (Nova 2 Sonic): {error_code} — {e}")
            
            # If the model doesn't support this content format, provide clear feedback
            if error_code in ("ValidationException", "ModelNotReadyException"):
                return {
                    "text": "",
                    "error": f"Nova 2 Sonic API error: {error_code}. "
                             "Speech-to-speech requires bidirectional audio streaming which "
                             "may need a WebSocket connection for full functionality.",
                    "model_used": self.settings.nova_sonic_model_id,
                    "has_audio_response": False,
                    "fallback_available": True,
                }
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova 2 Sonic: {e}")
            return {
                "text": "",
                "error": str(e),
                "model_used": self.settings.nova_sonic_model_id,
                "has_audio_response": False,
                "fallback_available": True,
            }

    async def invoke_nova_canvas(
        self,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        quality: str = "standard",
        cfg_scale: float = 8.0,
        seed: int = 0
    ) -> Dict[str, Any]:
        """
        Invoke Nova Canvas model for image generation.
        
        Uses amazon.nova-canvas-v1:0 — generates images from text prompts.
        Useful for generating visual incident reports and architecture diagrams.
        """
        try:
            request_body = {
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {
                    "text": prompt
                },
                "imageGenerationConfig": {
                    "numberOfImages": 1,
                    "height": height,
                    "width": width,
                    "cfgScale": cfg_scale,
                    "seed": seed,
                    "quality": quality
                }
            }
            
            logger.info(f"Invoking Nova Canvas ({self.settings.nova_canvas_model_id})")
            
            response = await asyncio.to_thread(
                self.client.invoke_model,
                modelId=self.settings.nova_canvas_model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            
            return {
                "images": response_body.get("images", []),
                "error": response_body.get("error"),
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error (Nova Canvas): {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova Canvas: {e}")
            raise
