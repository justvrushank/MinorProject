"""
Blue Carbon MRV Pipeline
Reuses logic from app.py — counts mangrove pixels, computes area and carbon, classifies risk.
"""
import numpy as np
import rasterio


def process_tif(file_path: str) -> dict:
    """
    Read a GeoTIFF, count mangrove pixels (value == 1),
    compute area in hectares and carbon estimate.

    Pixel resolution: 30m x 30m (Landsat default, matches original app.py)
    Carbon formula:   carbon = area_hectares * 100
    """
    with rasterio.open(file_path) as src:
        data = src.read(1)

    mangrove_pixels = int(np.sum(data == 1))

    pixel_area_m2 = 30 * 30                          # 30m x 30m
    area_hectares = round((mangrove_pixels * pixel_area_m2) / 10_000, 4)
    carbon_tons   = round(area_hectares * 100, 2)    # as in original app.py

    return {
        "area_hectares": area_hectares,
        "carbon_tons":   carbon_tons,
    }


def classify_risk(carbon_tons: float) -> str:
    """Risk classification matching original app.py thresholds."""
    if carbon_tons < 1000:
        return "Severe Loss"
    elif carbon_tons < 5000:
        return "Moderate"
    else:
        return "Healthy"


def run_mrv(file_path: str, filename: str) -> dict:
    """Full MRV run: process TIFF + classify risk. Returns API-ready dict."""
    metrics = process_tif(file_path)
    risk    = classify_risk(metrics["carbon_tons"])
    return {
        "file":               filename,
        "area_hectares":      metrics["area_hectares"],
        "carbon_tons":        metrics["carbon_tons"],
        "risk_classification": risk,
    }
