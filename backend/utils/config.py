"""
Configuration management for Nova Sentinel
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # AWS Configuration
    aws_region: str = "us-east-1"
    aws_profile: str = "default"
    
    # Amazon Bedrock Model IDs — Verified against Bedrock console model-ids (us-east-1)
    nova_lite_model_id: str = "amazon.nova-2-lite-v1:0"     # Nova 2 Lite (temporal, documentation)
    nova_pro_model_id: str = "amazon.nova-pro-v1:0"         # Nova Pro gen 1 (multimodal vision)
    nova_micro_model_id: str = "amazon.nova-micro-v1:0"     # Nova Micro gen 1 (fast classification)
    nova_sonic_model_id: str = "amazon.nova-2-sonic-v1:0"   # Nova 2 Sonic (speech; uses WebSocket streaming)
    nova_canvas_model_id: str = "amazon.nova-canvas-v1:0"  # Nova Canvas (image generation)
    
    # Nova Act — uses its own SDK, not Bedrock API
    # Requires NOVA_ACT_API_KEY environment variable
    nova_act_api_key: str = ""
    
    # AWS Resources
    dynamodb_table: str = "nova-sentinel-incidents"
    s3_bucket_cloudtrail: str = "nova-sentinel-cloudtrail-logs"
    s3_bucket_diagrams: str = "nova-sentinel-diagrams"
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
