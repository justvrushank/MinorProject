import uuid
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[str] = mapped_column(String, nullable=True)
    severity: Mapped[str] = mapped_column(String, default="info")
    title: Mapped[str] = mapped_column(String, nullable=True)
    message: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="new")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
