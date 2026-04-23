from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.analysis_job import JobStatus

class JobCreate(BaseModel):
    project_id: UUID

class JobStatusResponse(BaseModel):
    id: UUID
    project_id: UUID
    status: JobStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
