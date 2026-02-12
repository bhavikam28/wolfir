"""
Nova Canvas MCP Server — Custom implementation (boto3)

Provides MCP-compatible tools for image generation using Amazon Nova Canvas.
Generates visual security reports, attack path diagrams, and architecture
visualizations for incident documentation.

Inspired by awslabs/mcp nova-canvas-mcp-server (see github.com/awslabs/mcp).
"""
import json
import base64
import asyncio
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

import boto3
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


class NovaCanvasMCPServer:
    """
    Nova Canvas MCP tools for visual report generation.

    Custom implementation inspired by awslabs nova-canvas-mcp-server:
    - Text-based image generation (generate_image)
    - Color-guided image generation (generate_image_with_colors)
    - Workspace integration for saving images

    Security-specific features:
    - Incident report cover generation
    - Attack path diagram creation
    - Security posture visualization
    - Architecture diagram generation
    """

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        """Lazy-initialize Bedrock Runtime client for Nova Canvas."""
        if self._client is None:
            if self.settings.aws_profile and self.settings.aws_profile != "default":
                session = boto3.Session(profile_name=self.settings.aws_profile)
            else:
                session = boto3.Session()
            self._client = session.client('bedrock-runtime', region_name=self.settings.aws_region)
            logger.info(f"Nova Canvas MCP: client initialized ({self.settings.aws_region})")
        return self._client

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        quality: str = "standard",
        cfg_scale: float = 8.0,
        seed: int = 0,
        num_images: int = 1,
    ) -> Dict[str, Any]:
        """
        Generate an image using Amazon Nova Canvas.

        Inspired by awslabs nova-canvas-mcp-server generate_image tool spec.

        Args:
            prompt: Text description of the image to generate
            negative_prompt: What NOT to include in the image
            width: Image width (320-4096px, must be multiple of 64)
            height: Image height (320-4096px, must be multiple of 64)
            quality: "standard" or "premium"
            cfg_scale: How closely to follow the prompt (1.1-10.0)
            seed: Seed for reproducible generation (0 for random)
            num_images: Number of images to generate (1-5)

        Returns:
            Dict with base64-encoded image(s) and metadata
        """
        # Validate dimensions (Nova Canvas requirements)
        width = max(320, min(4096, width))
        height = max(320, min(4096, height))
        width = (width // 64) * 64
        height = (height // 64) * 64
        cfg_scale = max(1.1, min(10.0, cfg_scale))
        num_images = max(1, min(5, num_images))

        try:
            request_body = {
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {
                    "text": prompt,
                },
                "imageGenerationConfig": {
                    "numberOfImages": num_images,
                    "height": height,
                    "width": width,
                    "cfgScale": cfg_scale,
                    "quality": quality,
                }
            }

            if negative_prompt:
                request_body["textToImageParams"]["negativeText"] = negative_prompt

            if seed > 0:
                request_body["imageGenerationConfig"]["seed"] = seed

            logger.info(f"Nova Canvas MCP: generating image ({width}x{height}, quality={quality})")

            response = await asyncio.to_thread(
                self.client.invoke_model,
                modelId=self.settings.nova_canvas_model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )

            response_body = json.loads(response['body'].read())

            images = response_body.get("images", [])
            error = response_body.get("error")

            if error:
                return {
                    "success": False,
                    "error": error,
                    "source": "nova-canvas-mcp-server",
                }

            return {
                "success": True,
                "images": images,  # base64-encoded image strings
                "count": len(images),
                "dimensions": {"width": width, "height": height},
                "quality": quality,
                "model": self.settings.nova_canvas_model_id,
                "source": "nova-canvas-mcp-server",
            }

        except ClientError as e:
            logger.error(f"Nova Canvas MCP: generate_image failed: {e}")
            return {"success": False, "error": str(e), "source": "nova-canvas-mcp-server"}
        except Exception as e:
            logger.error(f"Nova Canvas MCP: unexpected error: {e}")
            return {"success": False, "error": str(e), "source": "nova-canvas-mcp-server"}

    async def generate_image_with_colors(
        self,
        prompt: str,
        colors: List[str],
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        quality: str = "standard",
        cfg_scale: float = 8.0,
    ) -> Dict[str, Any]:
        """
        Generate an image with specific color palette guidance.

        Inspired by awslabs generate_image_with_colors tool spec.

        Args:
            prompt: Text description of the image
            colors: List of hex color values (e.g., ["#4F46E5", "#10B981"])
            negative_prompt: What NOT to include
            width: Image width (320-4096px)
            height: Image height (320-4096px)
            quality: "standard" or "premium"
            cfg_scale: Prompt adherence (1.1-10.0)

        Returns:
            Dict with base64-encoded image and metadata
        """
        # Validate colors (max 10)
        colors = colors[:10]

        # Build color-guided prompt
        color_desc = ", ".join(colors)
        enhanced_prompt = f"{prompt}. Use a color palette featuring: {color_desc}"

        return await self.generate_image(
            prompt=enhanced_prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            quality=quality,
            cfg_scale=cfg_scale,
        )

    async def generate_security_report_cover(
        self,
        incident_type: str,
        severity: str = "CRITICAL",
        incident_id: str = "INC-000000",
    ) -> Dict[str, Any]:
        """
        Generate a professional security incident report cover image.

        Uses Nova Canvas to create a visually compelling cover for
        PDF exports and documentation.

        Args:
            incident_type: Type of incident (e.g., "Cryptocurrency Mining Attack")
            severity: Severity level (CRITICAL, HIGH, MEDIUM, LOW)
            incident_id: Incident identifier

        Returns:
            Dict with base64-encoded cover image
        """
        severity_colors = {
            "CRITICAL": ["#DC2626", "#991B1B", "#1E1B4B"],
            "HIGH": ["#EA580C", "#C2410C", "#1E1B4B"],
            "MEDIUM": ["#D97706", "#B45309", "#1E293B"],
            "LOW": ["#2563EB", "#1D4ED8", "#1E293B"],
        }

        colors = severity_colors.get(severity, severity_colors["HIGH"])

        prompt = (
            f"Professional cybersecurity incident report cover, modern enterprise design, "
            f"dark background with glowing accents, abstract digital shield icon, "
            f"network nodes and connection lines, subtle circuit board patterns, "
            f"clean typography area at bottom, {severity.lower()} severity level indicator, "
            f"corporate security aesthetic, high quality, detailed, 4K resolution"
        )

        negative_prompt = (
            "text, letters, words, numbers, writing, watermark, blurry, "
            "low quality, cartoon, anime, photorealistic faces, people"
        )

        result = await self.generate_image_with_colors(
            prompt=prompt,
            colors=colors,
            negative_prompt=negative_prompt,
            width=1280,
            height=720,
            quality="standard",
            cfg_scale=7.5,
        )

        if result.get("success"):
            result["report_metadata"] = {
                "incident_type": incident_type,
                "severity": severity,
                "incident_id": incident_id,
                "generated_at": datetime.utcnow().isoformat(),
            }

        return result

    async def generate_architecture_diagram(
        self,
        services: List[str],
        title: str = "AWS Architecture",
    ) -> Dict[str, Any]:
        """
        Generate an AWS architecture diagram visualization.

        Args:
            services: List of AWS services to include (e.g., ["EC2", "S3", "IAM"])
            title: Diagram title

        Returns:
            Dict with base64-encoded architecture diagram
        """
        services_str = ", ".join(services[:10])

        prompt = (
            f"Clean professional AWS cloud architecture diagram showing {services_str}, "
            f"modern flat design, dark blue background with white and blue icons, "
            f"connection lines between services, security layers highlighted, "
            f"enterprise infrastructure layout, technical diagram style, "
            f"clean isometric icons, professional infographic"
        )

        negative_prompt = (
            "text, letters, words, writing, photorealistic, blurry, "
            "low quality, cartoon faces, people, photographs"
        )

        return await self.generate_image(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=1280,
            height=720,
            quality="standard",
            cfg_scale=8.0,
        )

    async def generate_attack_path_visual(
        self,
        attack_stages: List[str],
        severity: str = "CRITICAL",
    ) -> Dict[str, Any]:
        """
        Generate a visual attack path diagram.

        Args:
            attack_stages: List of attack stages (e.g., ["Initial Access", "Privilege Escalation", "Lateral Movement"])
            severity: Overall severity

        Returns:
            Dict with base64-encoded attack path visualization
        """
        stages_str = " → ".join(attack_stages[:8])

        severity_colors = {
            "CRITICAL": ["#DC2626", "#7C2D12", "#0F172A"],
            "HIGH": ["#EA580C", "#92400E", "#0F172A"],
            "MEDIUM": ["#D97706", "#78350F", "#1E293B"],
            "LOW": ["#2563EB", "#1E3A5F", "#1E293B"],
        }

        prompt = (
            f"Cybersecurity attack chain diagram showing {stages_str}, "
            f"dark background with glowing red and orange nodes connected by animated lines, "
            f"each stage as a glowing node, threat flow visualization, "
            f"modern security operations center aesthetic, "
            f"MITRE ATT&CK style kill chain diagram, "
            f"professional technical visualization, high contrast"
        )

        negative_prompt = (
            "text, letters, words, writing, blurry, low quality, "
            "cartoon, anime, photorealistic faces"
        )

        return await self.generate_image_with_colors(
            prompt=prompt,
            colors=severity_colors.get(severity, severity_colors["CRITICAL"]),
            negative_prompt=negative_prompt,
            width=1280,
            height=640,
            quality="standard",
            cfg_scale=7.0,
        )


# Singleton
_nova_canvas_mcp = None

def get_nova_canvas_mcp() -> NovaCanvasMCPServer:
    global _nova_canvas_mcp
    if _nova_canvas_mcp is None:
        _nova_canvas_mcp = NovaCanvasMCPServer()
    return _nova_canvas_mcp
