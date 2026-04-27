import uuid
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class JobResult(Base):
    __tablename__ = "job_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id"), unique=True, nullable=False)
    total_area_ha: Mapped[float] = mapped_column(Float, nullable=True)
    mean_ndvi: Mapped[float] = mapped_column(Float, nullable=True)
    carbon_stock_tco2e: Mapped[float] = mapped_column(Float, nullable=True)
    pixel_count: Mapped[int] = mapped_column(Integer, nullable=True)
    resolution_m: Mapped[float] = mapped_column(Float, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
