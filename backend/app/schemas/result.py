from typing import Dict, Any
from pydantic import BaseModel

class ResultProperties(BaseModel):
    carbon_stock_tCO2e: float
    area_ha: float
    model_version: str
    computed_at: str

class ResultResponse(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: ResultProperties
