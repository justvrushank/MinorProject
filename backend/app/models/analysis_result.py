from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.core.database import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    job_id = Column(UUID(as_uuid=True), ForeignKey("analysis_jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    geometry = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326, spatial_index=True), nullable=False)
    carbon_stock_tCO2e = Column(Float, nullable=False)
    area_ha = Column(Float, nullable=False)
    model_version = Column(String, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
