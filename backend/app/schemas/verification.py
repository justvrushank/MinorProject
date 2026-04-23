from pydantic import BaseModel
from typing import Optional


class VerificationCreate(BaseModel):
    job_id: Optional[str] = None
    project_id: Optional[str] = None
    status: Optional[str] = "pending"
    notes: Optional[str] = None


class VerificationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class VerificationOut(BaseModel):
    id: str
    job_id: Optional[str] = None
    project_id: Optional[str] = None
    verifier_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    createdAt: Optional[str] = None
    model_config = {"from_attributes": True}
