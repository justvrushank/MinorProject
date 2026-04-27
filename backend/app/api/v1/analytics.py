from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.carbon_stock_reading import CarbonStockReading
from app.models.job_result import JobResult
from app.models.user import User

router = APIRouter()


@router.get("/carbon-stock")
async def get_carbon_stock_timeseries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return monthly carbon stock readings sorted ascending by month."""
    result = await db.execute(
        select(CarbonStockReading).order_by(CarbonStockReading.month.asc())
    )
    readings = result.scalars().all()
    return [
        {
            "month": r.month.strftime("%Y-%m"),
            "value": r.value,
        }
        for r in readings
    ]


@router.get("/summary")
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return aggregated stats: total carbon, verified count, etc."""
    result = await db.execute(select(JobResult))
    job_results = result.scalars().all()

    total_carbon = sum(jr.carbon_stock_tco2e or 0 for jr in job_results)
    verified_count = sum(1 for jr in job_results if jr.verified)
    total_area = sum(jr.total_area_ha or 0 for jr in job_results)

    return {
        "total_carbon_tco2e": round(total_carbon, 2),
        "verified_count": verified_count,
        "total_area_ha": round(total_area, 2),
    }
