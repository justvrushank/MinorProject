from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import json

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.analysis_job import AnalysisJob
from app.models.analysis_result import AnalysisResult
from app.schemas.result import ResultResponse

router = APIRouter()

@router.get("/{job_id}", response_model=ResultResponse)
async def get_result(job_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id, AnalysisJob.user_id == current_user.id))
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = await db.execute(
        select(
            AnalysisResult.carbon_stock_tCO2e,
            AnalysisResult.area_ha,
            AnalysisResult.model_version,
            AnalysisResult.computed_at,
            func.ST_AsGeoJSON(AnalysisResult.geometry).label('geometry')
        ).where(AnalysisResult.job_id == job_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")

    return {
        "type": "Feature",
        "geometry": json.loads(row.geometry),
        "properties": {
            "carbon_stock_tCO2e": row.carbon_stock_tCO2e,
            "area_ha": row.area_ha,
            "model_version": row.model_version,
            "computed_at": row.computed_at.isoformat()
        }
    }

@router.get("/projects/{project_id}/results")
async def get_project_results(project_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(
        AnalysisResult.carbon_stock_tCO2e,
        AnalysisResult.area_ha,
        AnalysisResult.model_version,
        AnalysisResult.computed_at,
        func.ST_AsGeoJSON(AnalysisResult.geometry).label('geometry')
    ).join(AnalysisJob, AnalysisJob.id == AnalysisResult.job_id).where(
        AnalysisJob.project_id == project_id,
        AnalysisJob.user_id == current_user.id
    )
    result = await db.execute(query)
    rows = result.all()
    
    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row.geometry),
            "properties": {
                "carbon_stock_tCO2e": row.carbon_stock_tCO2e,
                "area_ha": row.area_ha,
                "model_version": row.model_version,
                "computed_at": row.computed_at.isoformat()
            }
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }
