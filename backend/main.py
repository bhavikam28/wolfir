"""
Nova Sentinel — FastAPI Application
AI-Powered Security Incident Response using Amazon Nova

Architecture:
- Framework: FastAPI + Strands Agents SDK + MCP Server (FastMCP)
- Models: Nova 2 Lite, Nova Pro, Nova Micro, Nova 2 Sonic, Nova Canvas (5 Bedrock models)
- SDK: Nova Act (browser automation SDK, separate from Bedrock)
- Protocol: Model Context Protocol (MCP) via FastMCP
- Orchestration: Strands Agents SDK with @tool decorators
- AWS MCP Servers: CloudTrail, IAM, CloudWatch, Nova Canvas
"""
import os
import json
import boto3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from api import analysis, demo, visual, remediation, voice, orchestration, storage, documentation, auth, mcp, nova_act, incident_history, ai_security, threat_intel, report
from utils.config import get_settings
from utils.logger import logger

# Initialize settings
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    import os
    import json
    import boto3
    logger.warning("=" * 70)
    logger.warning("NOVA SENTINEL — Starting Up")
    logger.warning("=" * 70)
    logger.warning("This application uses YOUR AWS account and credentials.")
    logger.warning("All AWS charges (Bedrock, DynamoDB, S3) will be billed to YOUR account.")
    logger.warning("Estimated cost: ~$2-5/month for light usage.")
    logger.warning("=" * 70)
    logger.info(f"AWS Profile: {settings.aws_profile}")
    logger.info(f"AWS Region: {settings.aws_region}")
    logger.info(f"Nova 2 Lite: {settings.nova_lite_model_id}")
    logger.info(f"Nova Pro: {settings.nova_pro_model_id}")
    logger.info(f"Nova Micro: {settings.nova_micro_model_id}")
    logger.info(f"Nova 2 Sonic: {settings.nova_sonic_model_id}")
    logger.info(f"Nova Canvas: {settings.nova_canvas_model_id}")
    logger.info("Frameworks: Strands Agents SDK (real) + MCP Server (FastMCP)")
    logger.info("AWS MCP Servers: CloudTrail, IAM, CloudWatch, Nova Canvas")

    # Validate AWS credentials at startup
    try:
        session = boto3.Session(profile_name=settings.aws_profile) if settings.aws_profile and settings.aws_profile != "default" else boto3.Session()
        sts = session.client("sts", region_name=settings.aws_region)
        identity = sts.get_caller_identity()
        logger.info(f"AWS connected: Account {identity['Account']}, ARN: {identity['Arn']}")
    except Exception as e:
        logger.error(f"AWS CREDENTIALS NOT CONFIGURED: {e}")
        logger.error("Nova Sentinel requires valid AWS credentials with Bedrock access.")
        logger.error("Run: aws configure OR set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY")

    # Validate Bedrock model access
    try:
        session = boto3.Session(profile_name=settings.aws_profile) if settings.aws_profile and settings.aws_profile != "default" else boto3.Session()
        bedrock = session.client("bedrock-runtime", region_name=settings.aws_region)
        test_body = json.dumps({
            "messages": [{"role": "user", "content": [{"text": "test"}]}],
            "inferenceConfig": {"max_new_tokens": 1, "temperature": 0},
        })
        bedrock.invoke_model(
            modelId=settings.nova_micro_model_id,
            contentType="application/json",
            accept="application/json",
            body=test_body,
        )
        logger.info(f"Bedrock access verified: {settings.nova_micro_model_id}")
    except Exception as e:
        logger.error(f"BEDROCK ACCESS FAILED: {e}")
        logger.error("Ensure your IAM role/user has bedrock:InvokeModel permission")

    yield

# Create FastAPI app
app = FastAPI(
    title="Nova Sentinel",
    description=(
        "AI-Powered Security Incident Response using Amazon Nova — "
        "Strands Agents SDK + MCP Server + 5 Nova Bedrock Models + Nova Act SDK + "
        "4 AWS MCP Servers (CloudTrail, IAM, CloudWatch, Nova Canvas)"
    ),
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nova-sentinel.vercel.app",
    "https://www.nova-sentinel.vercel.app",
]
if os.environ.get("FRONTEND_URL"):
    url = os.environ["FRONTEND_URL"].rstrip("/")
    if url not in _cors_origins:
        _cors_origins.append(url)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST API routers
app.include_router(analysis.router)
app.include_router(demo.router)
app.include_router(visual.router)
app.include_router(remediation.router)
app.include_router(voice.router)
app.include_router(orchestration.router)
app.include_router(storage.router)
app.include_router(documentation.router)
app.include_router(auth.router)
app.include_router(mcp.router)
app.include_router(nova_act.router)
app.include_router(incident_history.router)
app.include_router(ai_security.router)
app.include_router(threat_intel.router)
app.include_router(report.router)

# Mount MCP SSE endpoint for standard MCP clients
# This provides a standards-compliant MCP interface alongside our REST API
try:
    from mcp_server import mcp_server as mcp_srv
    app.mount("/mcp", mcp_srv.sse_app())
    logger.info("MCP SSE endpoint mounted at /mcp/")
except Exception as e:
    logger.warning(f"Could not mount MCP SSE endpoint: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Nova Sentinel",
        "version": "3.0.0",
        "status": "running",
        "description": "AI-Powered Security Incident Response — 4 Nova Bedrock models + Nova Act SDK",
        "frameworks": {
            "strands": "strands-agents SDK (real)",
            "mcp": "MCP Server via FastMCP (real)",
            "nova_act": "nova-act SDK (real)",
        },
        "models": {
            "nova_2_lite": settings.nova_lite_model_id,
            "nova_pro": settings.nova_pro_model_id,
            "nova_micro": settings.nova_micro_model_id,
            "nova_2_sonic": settings.nova_sonic_model_id,
            "nova_canvas": settings.nova_canvas_model_id,
            "nova_act": "nova-act SDK (browser automation)",
        },
        "mcp_servers": [
            "cloudtrail-mcp-server — CloudTrail event analysis & anomaly detection",
            "iam-mcp-server — IAM security auditing & policy analysis",
            "cloudwatch-mcp-server — Security monitoring & billing anomalies",
            "nova-canvas-mcp-server — Visual report generation (custom boto3)",
        ],
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "region": settings.aws_region,
        "models": {
            "nova_2_lite": settings.nova_lite_model_id,
            "nova_pro": settings.nova_pro_model_id,
            "nova_micro": settings.nova_micro_model_id,
            "nova_2_sonic": settings.nova_sonic_model_id,
            "nova_canvas": settings.nova_canvas_model_id,
        },
        "frameworks": {
            "mcp": "MCP Server (FastMCP) — 22 tools, 4 AWS MCP servers",
            "strands": "Strands Agents SDK — 12 @tool decorators",
            "nova_act": "Nova Act SDK — browser automation",
        },
        "mcp_servers": {
            "cloudtrail": "Custom CloudTrail MCP (boto3, awslabs-inspired)",
            "iam": "Custom IAM MCP (boto3, awslabs-inspired)",
            "cloudwatch": "Custom CloudWatch MCP (boto3, awslabs-inspired)",
            "nova_canvas": "Custom Nova Canvas MCP (boto3, awslabs-inspired)",
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting Nova Sentinel on {settings.api_host}:{settings.api_port}")
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
