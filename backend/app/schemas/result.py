from pydantic import BaseModel
from typing import Literal


class ResultFeatureProperties(BaseModel):
    carbon_stock_tCO2e: float
    area_ha: float
    model_version: str
    computed_at: str


class ResultFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict
    properties: ResultFeatureProperties
