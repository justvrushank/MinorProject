import uuid
from sqlalchemy import String, Float, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class CarbonStockReading(Base):
    __tablename__ = "carbon_stock_readings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    month: Mapped[Date] = mapped_column(Date, unique=True, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
