"""
SecOps Lens Pro - FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from api import analysis, demo, visual, remediation, voice, orchestration, storage, documentation, auth, mcp, nova_act
from utils.config import get_settings
from utils.logger import logger

# Initialize settings
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.warning("=" * 70)
    logger.warning("⚠️  AWS BILLING NOTICE")
    logger.warning("=" * 70)
    logger.warning("This application uses YOUR AWS account and credentials.")
    logger.warning("All AWS charges (Bedrock, DynamoDB, S3) will be billed to YOUR account.")
    logger.warning("You are responsible for monitoring your AWS costs.")
    logger.warning("Estimated cost: ~$2-5/month for light usage.")
    logger.warning("=" * 70)
    logger.info(f"Using AWS profile: {settings.aws_profile}")
    logger.info(f"Using AWS region: {settings.aws_region}")
    yield
    # Shutdown (if needed)

# Create FastAPI app
app = FastAPI(
    title="SecOps Lens Pro",
    description="AI-Powered Security Incident Response using Amazon Nova",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite and alternative dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
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


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SecOps Lens Pro",
        "version": "1.0.0",
        "status": "running",
        "description": "AI-Powered Security Incident Response"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "region": settings.aws_region,
        "models": {
            "nova_lite": settings.nova_lite_model_id,
            "nova_pro": settings.nova_pro_model_id,
            "nova_micro": settings.nova_micro_model_id,
            "nova_sonic": settings.nova_sonic_model_id
        },
        "frameworks": {
            "mcp": "Model Context Protocol v1.0",
            "strands": "Strands Agents Framework"
        }
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
    
    logger.info(f"Starting SecOps Lens Pro on {settings.api_host}:{settings.api_port}")
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
