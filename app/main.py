from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    aggregation_router,
    auth_router,
    instrument_router,
    labels_router,
    measurements_router,
    missions_router,
    scenarios_router,
    tracks_router,
    type_router,
    users_router,
    visitors_router,
)
from app.core.config import settings
from app.core.database import engine
from app.utils.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
)
from app.websocket.handlers import websocket_stream_handler

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting up %s v%s", settings.APP_NAME, settings.APP_VERSION)
    yield
    logger.info("Shutting down — disposing DB engine")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade Environmental Monitoring REST API with WebSocket streaming.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handlers ─────────────────────────────────────────────────

@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(ConflictException)
async def conflict_handler(request: Request, exc: ConflictException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(UnauthorizedException)
async def unauthorized_handler(request: Request, exc: UnauthorizedException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers or {},
    )


@app.exception_handler(ForbiddenException)
async def forbidden_handler(request: Request, exc: ForbiddenException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(BadRequestException)
async def bad_request_handler(request: Request, exc: BadRequestException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred"},
    )


# ── API routes ─────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(scenarios_router, prefix=API_PREFIX)
app.include_router(measurements_router, prefix=API_PREFIX)
app.include_router(type_router, prefix=API_PREFIX)
app.include_router(instrument_router, prefix=API_PREFIX)
app.include_router(visitors_router, prefix=API_PREFIX)
app.include_router(tracks_router, prefix=API_PREFIX)
app.include_router(missions_router, prefix=API_PREFIX)
app.include_router(labels_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(aggregation_router, prefix=API_PREFIX)


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/stream")
async def websocket_endpoint(
    websocket: WebSocket,
    topics: str | None = None,
    bbox: str | None = None,
    mission_id: str | None = None,
) -> None:
    await websocket_stream_handler(
        websocket,
        topics=topics,
        bbox=bbox,
        mission_id=mission_id,
    )


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    return {"status": "ok", "version": settings.APP_VERSION}
