from pydantic import BaseModel
from typing import Optional, Any


class JobOut(BaseModel):
    id: str
    projectId: str
    projectName: Optional[str] = None
    fileName: Optional[str] = None
    status: str
    result: Optional[Any] = None      # full TifResult dict (JSON column)
    results: Optional[Any] = None     # alias — same value, keeps frontend compat
    createdAt: str
    updatedAt: Optional[str] = None
    model_config = {"from_attributes": True}
