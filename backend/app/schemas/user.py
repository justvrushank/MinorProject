from pydantic import BaseModel
from typing import Optional


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
