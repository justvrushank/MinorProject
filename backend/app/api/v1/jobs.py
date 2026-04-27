"""
/api/jobs  —  CRUD + async GeoTIFF processing
================================================
• POST /api/jobs          multipart/form-data  →  create job + kick off background task
• GET  /api/jobs          list all jobs for current user (admin sees all)
• GET  /api/jobs/{id}     single job detail
• GET  /api/jobs/{id}/results  full result dict once job is COMPLETE
• GET  /api/jobs/{id}/geojson  GeoJSON FeatureCollection once job is COMPLETE
"""

import asyncio
import logging
import os
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.api.deps import get_current_user
from app.models.job import Job
from app.models.project import Project
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = "/tmp/tif_uploads"

# ── Status enum (string values kept lower-case to match DB) ──────────────────
_PENDING  = "pending"
_RUNNING  = "running"
_COMPLETE = "complete"
_FAILED   = "failed"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _job_to_dict(job: Job, project_name: str | None = None) -> dict:
    return {
        "id":          job.id,
        "projectId":   job.project_id,
        "projectName": project_name,
        "fileName":    job.file_name,
        "status":      job.status,
        "result":      job.result,
        "results":     job.result,          # alias keeps existing frontend key working
        "createdAt":   job.created_at.isoformat() if job.created_at else None,
        "updatedAt":   job.updated_at.isoformat() if job.updated_at else None,
    }


async def _get_project_name(db: AsyncSession, project_id: str) -> str | None:
    row = await db.execute(select(Project).where(Project.id == project_id))
    p = row.scalar_one_or_none()
    return p.name if p else None


# ── Background task ──────────────────────────────────────────────────────────

async def run_job(job_id: str, file_path: str) -> None:
    """
    Background coroutine:
      1. Set status → RUNNING
      2. Call process_tif()
      3. Call tif_to_geojson() and embed result under 'geojson' key
      4. Set status → COMPLETE and store result JSON
         OR set status → FAILED and store error_message
      5. Always delete the temp file
    """
    # Lazy import to keep startup fast and avoid import errors if rasterio
    # is missing at module load time.
    from app.services.tif_processor import process_tif, tif_to_geojson

    async with AsyncSessionLocal() as db:
        # ── Step 1: mark running ─────────────────────────────────────────────
        await db.execute(
            update(Job)
            .where(Job.id == job_id)
            .values(status=_RUNNING, updated_at=datetime.now(timezone.utc))
        )
        await db.commit()
        logger.info("Job %s → running", job_id)

        # ── Step 2: process ──────────────────────────────────────────────────
        try:
            # rasterio is CPU-bound; run in a thread executor so we don't
            # block the event loop for other requests.
            loop = asyncio.get_event_loop()
            result_dict = await loop.run_in_executor(
                None, process_tif, file_path
            )

            # ── Step 3: generate GeoJSON grid ─────────────────────────────────
            geojson_data = await loop.run_in_executor(
                None, tif_to_geojson, file_path
            )
            result_dict["geojson"] = geojson_data

            # ── Step 4a: mark complete ────────────────────────────────────────
            await db.execute(
                update(Job)
                .where(Job.id == job_id)
                .values(
                    status=_COMPLETE,
                    result=result_dict,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()
            logger.info("Job %s → complete", job_id)

        except Exception as exc:
            error_msg = str(exc)[:500]
            logger.error("Job %s failed: %s", job_id, error_msg)

            await db.execute(
                update(Job)
                .where(Job.id == job_id)
                .values(
                    status=_FAILED,
                    error_message=error_msg,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()

        finally:
            # ── Step 5: clean up temp file ────────────────────────────────────
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.debug("Deleted temp file %s", file_path)
            except OSError as oe:
                logger.warning("Could not delete %s: %s", file_path, oe)


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", status_code=202)
async def create_job(
    background_tasks: BackgroundTasks,
    project_id: str = Form(..., alias="project_id"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept multipart/form-data with:
      • project_id  – UUID string of the target project
      • file        – .tif / .tiff GeoTIFF

    Returns the created Job immediately (status PENDING).
    Processing happens asynchronously in the background.
    """
    # Validate file extension
    fname = file.filename or ""
    if not fname.lower().endswith((".tif", ".tiff")):
        raise HTTPException(status_code=400, detail="Only .tif or .tiff files are accepted.")

    # Validate project exists
    pr = await db.execute(select(Project).where(Project.id == project_id))
    project = pr.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

    # Save upload to temp directory
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    unique_prefix = str(uuid.uuid4())
    safe_name = fname.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, f"{unique_prefix}_{safe_name}")

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Create job record
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        project_id=project_id,
        created_by=current_user.id,
        file_name=fname,
        file_path=file_path,
        status=_PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Kick off background processing
    background_tasks.add_task(run_job, job_id, file_path)

    return _job_to_dict(job, project.name)


@router.get("")
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List jobs. Admins see all; others see only their own."""
    if current_user.role == "admin":
        q = select(Job)
    else:
        q = select(Job).where(Job.created_by == current_user.id)

    rows = await db.execute(q)
    jobs = rows.scalars().all()

    out = []
    for job in jobs:
        pname = await _get_project_name(db, job.project_id)
        out.append(_job_to_dict(job, pname))
    return out


@router.get("/{job_id}/results")
async def get_job_results(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the full result JSON for a completed job.

    • 404 if job not found
    • 400 if job is not yet COMPLETE (includes PENDING / RUNNING / FAILED)
    """
    row = await db.execute(select(Job).where(Job.id == job_id))
    job = row.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != _COMPLETE:
        raise HTTPException(
            status_code=400,
            detail=f"Job is not complete yet (current status: {job.status}).",
        )
    return job.result


@router.get("/{job_id}/geojson")
async def get_job_geojson(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the GeoJSON FeatureCollection for a completed job.

    • 404 if job not found
    • 400 with "Job not complete" if status is not COMPLETE
    • 404 with "No GeoJSON data available" if geojson key is missing
    """
    row = await db.execute(select(Job).where(Job.id == job_id))
    job = row.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != _COMPLETE:
        raise HTTPException(status_code=400, detail="Job not complete.")
    if not job.result or "geojson" not in job.result:
        raise HTTPException(status_code=404, detail="No GeoJSON data available.")
    return job.result["geojson"]


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a single job by ID."""
    row = await db.execute(select(Job).where(Job.id == job_id))
    job = row.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    pname = await _get_project_name(db, job.project_id)
    return _job_to_dict(job, pname)
