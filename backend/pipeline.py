"""
Blue Carbon MRV Pipeline
IPCC Tier 1 blue carbon: 392 tCO2/ha for mangroves
GMW dataset pixel resolution: 25m x 25m
"""
import re
import numpy as np
from pathlib import Path

CARBON_PER_HA: float = 392.0      # IPCC Tier 1 mangrove default
PIXEL_SIZE_M: int = 25             # Global Mangrove Watch native resolution


def parse_filename(filename: str) -> dict:
    """
    Parse GMW filename convention to lat, lon, year.
    GMW_N22E089_2008_v3.tif  →  {'lat': 22.0, 'lon': 89.0, 'year': 2008}
    """
    stem = Path(filename).stem
    m = re.match(r"GMW_([NS])(\d+)([EW])(\d+)_(\d{4})_v\d+", stem)
    if not m:
        return {"lat": None, "lon": None, "year": None}
    ns, lat, ew, lon, year = m.groups()
    return {
        "lat": float(lat) * (1 if ns == "N" else -1),
        "lon": float(lon) * (1 if ew == "E" else -1),
        "year": int(year),
    }


def process_tif(file_path: str) -> dict:
    """
    Read a GeoTIFF, count mangrove pixels (value == 1),
    compute area and carbon stock.
    Returns dict with area_ha, carbon_tco2.
    Raises on corrupt/unreadable file.
    """
    import rasterio

    with rasterio.open(file_path) as src:
        data = src.read(1)
        # Use actual transform if CRS is projected; fallback to GMW default
        try:
            pixel_m2 = abs(src.transform.a) * abs(src.transform.e)
            if pixel_m2 > 1_000_000 or pixel_m2 < 1:   # sanity check
                pixel_m2 = PIXEL_SIZE_M ** 2
        except Exception:
            pixel_m2 = PIXEL_SIZE_M ** 2

    mangrove_px = int(np.sum(data == 1))
    area_ha = round((mangrove_px * pixel_m2) / 10_000, 4)
    carbon = round(area_ha * CARBON_PER_HA, 2)

    return {
        "mangrove_pixels": mangrove_px,
        "area_ha": area_ha,
        "carbon_tco2": carbon,
    }


def classify_risk(area_ha: float) -> str:
    """Risk tier based on mangrove patch size (area proxy for ecosystem health)."""
    if area_ha < 10:
        return "Severe Loss"
    elif area_ha < 100:
        return "Moderate"
    else:
        return "Healthy"


def process_file_full(file_path: str) -> dict:
    """Convenience: process + parse filename + classify risk."""
    fname = Path(file_path).name
    metrics = process_tif(file_path)
    geo = parse_filename(fname)
    risk = classify_risk(metrics["area_ha"])
    return {
        "file": fname,
        **metrics,
        **geo,
        "risk": risk,
    }
