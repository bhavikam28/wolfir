"""
wolfir — FastAPI Application
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
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

from api import analysis, demo, visual, remediation, voice, orchestration, storage, documentation, auth, mcp, nova_act, incident_history, ai_security, threat_intel, report, changeset, rubric, protocol
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
    logger.warning("WOLFIR — Starting Up")
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
        logger.error("wolfir requires valid AWS credentials with Bedrock access.")
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

# Rate limiter — 60 req/min per IP for API protection
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# Create FastAPI app
app = FastAPI(
    title="wolfir",
    description=(
        "AI-Powered Security Incident Response using Amazon Nova — "
        "Strands Agents SDK + MCP Server + 5 Nova Bedrock Models + Nova Act SDK + "
        "6 AWS MCP Servers (CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, AI Security)"
    ),
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Max request body size (5MB) — prevents memory exhaustion from oversized POSTs
MAX_BODY_SIZE = 5 * 1024 * 1024


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """Reject requests with Content-Length exceeding limit before reading body."""

    async def dispatch(self, request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > MAX_BODY_SIZE:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Request body too large (max {MAX_BODY_SIZE // (1024*1024)}MB)"},
                    )
            except ValueError:
                pass
        return await call_next(request)


# Configure CORS
_cors_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://wolfir.vercel.app",
    "https://www.wolfir.vercel.app",
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
app.add_middleware(MaxBodySizeMiddleware)

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
app.include_router(changeset.router)
app.include_router(rubric.router)
app.include_router(protocol.router)

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
        "service": "wolfir",
        "version": "3.0.0",
        "status": "running",
        "description": "AI-Powered Cloud + AI Security — 5 Nova Bedrock models + Nova Act SDK + Nova Embeddings",
        "frameworks": {
            "strands": "strands-agents SDK (real)",
            "mcp": "MCP Server via FastMCP (real) — 6 AWS MCP servers, 23 tools",
            "nova_act": "nova-act SDK (browser automation)",
        },
        "models": {
            "nova_2_lite": settings.nova_lite_model_id,
            "nova_pro": settings.nova_pro_model_id,
            "nova_micro": settings.nova_micro_model_id,
            "nova_2_sonic": settings.nova_sonic_model_id,
            "nova_canvas": settings.nova_canvas_model_id,
            "nova_act": "nova-act SDK (browser automation)",
            "nova_embeddings": "amazon.nova-2-multimodal-embeddings-v1:0 (incident similarity)",
        },
        "mcp_servers": [
            "cloudtrail-mcp-server — CloudTrail event analysis & anomaly detection",
            "iam-mcp-server — IAM security auditing & policy analysis",
            "cloudwatch-mcp-server — Security monitoring & billing anomalies",
            "security-hub-mcp-server — GuardDuty & Inspector findings",
            "nova-canvas-mcp-server — Visual report generation",
            "ai-security-mcp-server — MITRE ATLAS & OWASP LLM monitoring",
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
            "mcp": "MCP Server (FastMCP) — 6 AWS MCP servers, 23+ tools",
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
    
    logger.info(f"Starting wolfir on {settings.api_host}:{settings.api_port}")
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
