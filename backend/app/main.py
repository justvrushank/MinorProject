from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import settings
from app.core.database import engine
from app.core.redis import redis_pool
from app.api.v1 import auth, projects, jobs, results, users
from app.core.logging import setup_logging

setup_logging()
logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await logger.ainfo("Starting up...")
    yield
    await logger.ainfo("Shutting down...")
    await engine.dispose()
    await redis_pool.disconnect()

app = FastAPI(title="Blue Carbon MRV API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def logging_middleware(request, call_next):
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        method=request.method,
        url=str(request.url),
        client_host=request.client.host
    )
    response = await call_next(request)
    structlog.contextvars.bind_contextvars(status_code=response.status_code)
    await logger.ainfo("request processed")
    return response

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(results.router, prefix="/api/results", tags=["results"])
