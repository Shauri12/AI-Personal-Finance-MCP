"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db, async_session
from app.api import auth, finance, analytics, chat, ai_advanced, websocket
from app.services.seed_data import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    await init_db()
    # Seed demo data
    async with async_session() as session:
        await seed_demo_data(session)
        await session.commit()
    print(f"START: {settings.APP_NAME} v{settings.APP_VERSION} started!")
    yield
    # Shutdown
    print("STOP: Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Personal Finance Platform with MCP Architecture",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(finance.router)
app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(ai_advanced.router)
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
