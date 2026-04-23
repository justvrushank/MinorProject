from app.tasks.celery_app import celery
from sqlalchemy import create_engine, update
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.job import Job
from app.models.result import Result
from datetime import datetime, timezone
import uuid

# Sync engine for Celery worker (must use psycopg2, not asyncpg)
sync_engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", "+psycopg2"))


@celery.task(bind=True, acks_late=True)
def process_geotiff(self, job_id: str, file_path: str):
    with Session(sync_engine) as db:
        try:
            db.execute(
                update(Job)
                .where(Job.id == job_id)
                .values(status="running", updated_at=datetime.now(timezone.utc))
            )
            db.commit()

            pixel_sum = 0.0
            pixel_count = 0

            import rasterio
            import numpy as np

            with rasterio.open(file_path) as src:
                for _, window in src.block_windows(1):
                    data = src.read(1, window=window).astype(np.float64)
                    pixel_sum += float(np.nansum(data))
                    pixel_count += int(np.count_nonzero(~np.isnan(data)))

                res_x = abs(src.res[0])
                res_y = abs(src.res[1])
                area_ha = (src.width * src.height * res_x * res_y) / 10000
                band_mean = pixel_sum / pixel_count if pixel_count > 0 else 0.0
                carbon_stock = band_mean * area_ha * 0.47

            result = Result(
                id=str(uuid.uuid4()),
                job_id=job_id,
                carbon_stock_tco2e=round(carbon_stock, 4),
                area_ha=round(area_ha, 4),
                model_version="v0.1-stub",
            )
            db.add(result)
            db.execute(
                update(Job)
                .where(Job.id == job_id)
                .values(status="complete", updated_at=datetime.now(timezone.utc))
            )
            db.commit()

        except Exception as exc:
            db.execute(
                update(Job)
                .where(Job.id == job_id)
                .values(status="failed", updated_at=datetime.now(timezone.utc))
            )
            db.commit()
            raise self.retry(exc=exc, max_retries=0)
