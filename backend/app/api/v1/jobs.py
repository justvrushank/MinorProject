import os
import shutil
import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import redis.asyncio as redis

from app.api.deps import get_db, get_redis, get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.analysis_job import AnalysisJob, JobStatus
from app.schemas.job import JobStatusResponse
from app.tasks.mrv_processor import process_tiff

router = APIRouter()

@router.post("", response_model=JobStatusResponse)
async def create_job(
    background_tasks: BackgroundTasks,
    project_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis)
):
    res = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == current_user.id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    job = AnalysisJob(
        project_id=project_id,
        user_id=current_user.id,
        status=JobStatus.pending,
        tiff_filename=file_path
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    job_dict = {
        "id": str(job.id),
        "project_id": str(job.project_id),
        "status": job.status.value,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat()
    }
    await redis_client.set(f"job:{job.id}", json.dumps(job_dict))
    
    background_tasks.add_task(process_tiff, job.id, file_path)
    
    return job

@router.get("/{id}/status", response_model=JobStatusResponse)
async def get_job_status(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis)
):
    cached_job = await redis_client.get(f"job:{id}")
    if cached_job:
        return json.loads(cached_job)
        
    res = await db.execute(select(AnalysisJob).where(AnalysisJob.id == id, AnalysisJob.user_id == current_user.id))
    job = res.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job_dict = {
        "id": str(job.id),
        "project_id": str(job.project_id),
        "status": job.status.value,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat()
    }
    await redis_client.set(f"job:{id}", json.dumps(job_dict))
    return job
