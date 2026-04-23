import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.job import Job
from app.models.project import Project
from app.models.result import Result
from app.models.user import User
from app.schemas.job import JobOut
from app.tasks.tasks import process_geotiff

router = APIRouter()

UPLOAD_DIR = "/tmp"


def job_to_out(
    job: Job,
    project_name: str | None = None,
    result: Result | None = None,
) -> dict:
    out = {
        "id": job.id,
        "projectId": job.project_id,
        "projectName": project_name,
        "fileName": job.file_name,
        "status": job.status,
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "updatedAt": job.updated_at.isoformat() if job.updated_at else None,
        "result": None,
    }
    if result and job.status == "complete":
        out["result"] = {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": []},
            "properties": {
                "carbon_stock_tCO2e": result.carbon_stock_tco2e,
                "area_ha": result.area_ha,
                "model_version": result.model_version,
                "computed_at": result.computed_at.isoformat() if result.computed_at else None,
            },
        }
    return out


@router.post("", status_code=202)
async def create_job(
    projectId: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith((".tif", ".tiff")):
        raise HTTPException(status_code=400, detail="Only .tif or .tiff files accepted")

    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.tif")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    job = Job(
        id=job_id,
        project_id=projectId,
        created_by=current_user.id,
        file_name=file.filename,
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    process_geotiff.delay(job_id, file_path)

    pr = await db.execute(select(Project).where(Project.id == projectId))
    project = pr.scalar_one_or_none()
    return job_to_out(job, project.name if project else None)


@router.get("", response_model=list[JobOut])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(Job)
        if current_user.role == "admin"
        else select(Job).where(Job.created_by == current_user.id)
    )
    jobs_result = await db.execute(q)
    jobs = jobs_result.scalars().all()
    out = []
    for job in jobs:
        pr = await db.execute(select(Project).where(Project.id == job.project_id))
        project = pr.scalar_one_or_none()
        res = await db.execute(select(Result).where(Result.job_id == job.id))
        result = res.scalar_one_or_none()
        out.append(job_to_out(job, project.name if project else None, result))
    return out


@router.get("/{id}")
async def get_job(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job_result = await db.execute(select(Job).where(Job.id == id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    pr = await db.execute(select(Project).where(Project.id == job.project_id))
    project = pr.scalar_one_or_none()
    res = await db.execute(select(Result).where(Result.job_id == job.id))
    result = res.scalar_one_or_none()
    return job_to_out(job, project.name if project else None, result)
