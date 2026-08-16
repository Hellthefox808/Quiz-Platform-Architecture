from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from backend.app.api.deps import limiter
from backend.app.api.v1.router import api_router
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.core.exceptions import AppException
from backend.app.core.middlewares import (
    RequestCorrelationMiddleware,
    app_exception_handler,
    general_exception_handler,
    validation_exception_handler,
)
import backend.app.models  # Ensure all models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize schema tables asynchronously on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown logic
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# SlowAPI Rate Limiting
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Request Correlation ID and Structured Logging
app.add_middleware(RequestCorrelationMiddleware)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(RateLimitExceeded, lambda req, exc: app_exception_handler(req, AppException(429, "RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down.")))
app.add_exception_handler(Exception, general_exception_handler)

# Include v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": "Quiz Management & Online Assessment Platform API is operational",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
