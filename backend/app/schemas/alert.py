from pydantic import BaseModel
from typing import Optional


class AlertOut(BaseModel):
    id: str
    type: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    read: bool = False
    projectId: Optional[str] = None
    createdAt: Optional[str] = None
    model_config = {"from_attributes": True}
