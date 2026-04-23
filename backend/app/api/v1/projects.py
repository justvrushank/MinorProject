from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.project import Project
from app.models.job import Job
from app.models.result import Result
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
import uuid

router = APIRouter()


def project_to_out(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "location": p.location,
        "description": p.description,
        "status": p.status,
        "createdBy": p.created_by,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }


def result_to_feature(r: Result) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": []},
        "properties": {
            "carbon_stock_tCO2e": r.carbon_stock_tco2e,
            "area_ha": r.area_ha,
            "model_version": r.model_version,
            "computed_at": r.computed_at.isoformat() if r.computed_at else None,
        },
    }


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(Project)
        if current_user.role == "admin"
        else select(Project).where(Project.created_by == current_user.id)
    )
    result = await db.execute(q)
    return [project_to_out(p) for p in result.scalars().all()]


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(id=str(uuid.uuid4()), created_by=current_user.id, **body.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project_to_out(project)


@router.get("/{id}", response_model=ProjectOut)
async def get_project(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_to_out(project)


@router.put("/{id}", response_model=ProjectOut)
async def update_project(
    id: str,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(project, k, v)
    await db.commit()
    await db.refresh(project)
    return project_to_out(project)


@router.delete("/{id}", status_code=204)
async def delete_project(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()


@router.get("/{id}/results")
async def get_project_results(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs_result = await db.execute(select(Job).where(Job.project_id == id))
    jobs = jobs_result.scalars().all()
    features = []
    for job in jobs:
        res = await db.execute(select(Result).where(Result.job_id == job.id))
        r = res.scalar_one_or_none()
        if r:
            features.append(result_to_feature(r))
    return features
