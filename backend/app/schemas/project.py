from pydantic import BaseModel
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "active"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    model_config = {"from_attributes": True}
