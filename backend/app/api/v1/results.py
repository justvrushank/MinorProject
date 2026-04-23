from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.result import Result
from app.models.user import User

router = APIRouter()


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


@router.get("/{jobId}")
async def get_result(
    jobId: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Result).where(Result.job_id == jobId))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Result not found")
    return result_to_feature(r)
