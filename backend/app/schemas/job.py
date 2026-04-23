from pydantic import BaseModel
from typing import Optional


class JobOut(BaseModel):
    id: str
    projectId: str
    projectName: Optional[str] = None
    fileName: Optional[str] = None
    status: str
    createdAt: str
    updatedAt: Optional[str] = None
    result: Optional[dict] = None
    model_config = {"from_attributes": True}
