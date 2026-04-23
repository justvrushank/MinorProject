import uuid
from sqlalchemy import String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry
from app.core.database import Base


class Result(Base):
    __tablename__ = "results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id"), unique=True, nullable=False)
    carbon_stock_tco2e: Mapped[float] = mapped_column(Float, nullable=True)
    area_ha: Mapped[float] = mapped_column(Float, nullable=True)
    model_version: Mapped[str] = mapped_column(String, default="v0.1-stub")
    geometry = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)
    computed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
