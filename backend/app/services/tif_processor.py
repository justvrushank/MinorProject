"""
tif_processor.py
================
Processes a GeoTIFF raster file and returns carbon-stock metrics.

IPCC Tier 1 blue-carbon coefficients applied:
  biomass density  : 160 tC / ha
  carbon fraction  : 0.47
  CO₂ factor       : 3.67  (44/12)

Returns
-------
dict with keys:
    valid_area_ha, total_carbon_tco2e, avg_carbon_per_ha,
    ndvi_mean, band_mean, band_min, band_max,
    crs, width_px, height_px, band_count,
    valid_pixels, total_pixels,
    bbox  { west, south, east, north }   # always WGS-84
"""

from __future__ import annotations

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds

# ── IPCC Tier 1 blue-carbon constants ────────────────────────────────────────
_BIOMASS_TC_PER_HA: float = 160.0   # tC ha⁻¹  (mangrove above+below ground)
_CARBON_FRACTION: float = 0.47      # dimensionless
_CO2_FACTOR: float = 3.67           # tCO₂e / tC  (= 44/12)

# Combined multiplier: tCO₂e per hectare of valid mangrove canopy
_TCO2E_PER_HA: float = _BIOMASS_TC_PER_HA * _CARBON_FRACTION * _CO2_FACTOR


def _pixel_area_ha(src: rasterio.DatasetReader) -> float:
    """Return the area of a single pixel in hectares."""
    transform = src.transform
    size_x = abs(transform.a)
    size_y = abs(transform.e)

    if src.crs and src.crs.is_geographic:
        # Geographic CRS: pixel size is in degrees → convert to metres
        # Use mean latitude of the dataset for the Y-scale conversion.
        import math
        bounds = src.bounds
        lat_mid = (bounds.top + bounds.bottom) / 2.0
        metres_per_deg_lon = 111_320.0 * math.cos(math.radians(lat_mid))
        metres_per_deg_lat = 111_320.0
        size_x_m = size_x * metres_per_deg_lon
        size_y_m = size_y * metres_per_deg_lat
    else:
        # Projected CRS: pixel size already in metres (or close enough)
        size_x_m = size_x
        size_y_m = size_y

    pixel_area_m2 = size_x_m * size_y_m
    return pixel_area_m2 / 10_000.0  # m² → ha


def _wgs84_bbox(src: rasterio.DatasetReader) -> dict:
    """Return the dataset extent in WGS-84 (EPSG:4326)."""
    wgs84 = CRS.from_epsg(4326)
    if src.crs is None or src.crs == wgs84:
        b = src.bounds
        return {
            "west": round(b.left, 6),
            "south": round(b.bottom, 6),
            "east": round(b.right, 6),
            "north": round(b.top, 6),
        }
    left, bottom, right, top = transform_bounds(src.crs, wgs84, *src.bounds)
    return {
        "west": round(left, 6),
        "south": round(bottom, 6),
        "east": round(right, 6),
        "north": round(top, 6),
    }


def process_tif(file_path: str) -> dict:
    """
    Open *file_path* with rasterio and compute blue-carbon metrics.

    Parameters
    ----------
    file_path : str
        Absolute path to an existing GeoTIFF file.

    Returns
    -------
    dict
        See module docstring for field list.

    Raises
    ------
    ValueError
        If the file contains no valid pixels.
    """
    with rasterio.open(file_path) as src:
        band_count: int = src.count
        width_px: int = src.width
        height_px: int = src.height
        total_pixels: int = width_px * height_px
        crs_str: str = src.crs.to_string() if src.crs else "unknown"

        pixel_ha = _pixel_area_ha(src)
        bbox = _wgs84_bbox(src)

        # ── Band 1: biomass proxy ─────────────────────────────────────────────
        raw_b1 = src.read(1).astype(np.float64)

        # Mask nodata
        if src.nodata is not None:
            raw_b1 = np.where(raw_b1 == src.nodata, np.nan, raw_b1)

        valid_mask = np.isfinite(raw_b1)
        valid_pixels: int = int(np.sum(valid_mask))

        if valid_pixels == 0:
            raise ValueError("No valid (non-nodata, finite) pixels found in raster band 1.")

        valid_b1 = raw_b1[valid_mask]

        # Normalise to [0, 1] — handles both reflectance (0–1) and DN (0–10000)
        b1_min = float(np.min(valid_b1))
        b1_max = float(np.max(valid_b1))
        if b1_max > b1_min:
            norm_b1 = (valid_b1 - b1_min) / (b1_max - b1_min)
        else:
            norm_b1 = np.zeros_like(valid_b1)

        band_mean = float(np.mean(norm_b1))
        band_min  = float(np.min(norm_b1))
        band_max  = float(np.max(norm_b1))

        # ── NDVI from band 4 (NIR) and band 3 (Red) ──────────────────────────
        ndvi_mean: float | None = None
        if band_count >= 4:
            nir = src.read(4).astype(np.float64)
            red = src.read(3).astype(np.float64)
            # Propagate nodata
            if src.nodata is not None:
                nir = np.where(nir == src.nodata, np.nan, nir)
                red = np.where(red == src.nodata, np.nan, red)

            denom = nir + red
            with np.errstate(invalid="ignore", divide="ignore"):
                ndvi = np.where(denom != 0, (nir - red) / denom, np.nan)

            ndvi_valid = ndvi[np.isfinite(ndvi)]
            if ndvi_valid.size > 0:
                ndvi_mean = float(np.clip(np.mean(ndvi_valid), -1.0, 1.0))

        # ── Area and carbon stock ─────────────────────────────────────────────
        valid_area_ha: float = valid_pixels * pixel_ha
        total_carbon_tco2e: float = valid_area_ha * _TCO2E_PER_HA
        avg_carbon_per_ha: float = _TCO2E_PER_HA  # constant by definition

    return {
        "valid_area_ha":      round(valid_area_ha, 4),
        "total_carbon_tco2e": round(total_carbon_tco2e, 4),
        "avg_carbon_per_ha":  round(avg_carbon_per_ha, 4),
        "ndvi_mean":          round(ndvi_mean, 4) if ndvi_mean is not None else None,
        "band_mean":          round(band_mean, 6),
        "band_min":           round(band_min, 6),
        "band_max":           round(band_max, 6),
        "crs":                crs_str,
        "width_px":           width_px,
        "height_px":          height_px,
        "band_count":         band_count,
        "valid_pixels":       valid_pixels,
        "total_pixels":       total_pixels,
        "bbox":               bbox,
    }


def tif_to_geojson(file_path: str, grid_size: int = 50) -> dict:
    """
    Resample band 1 of a GeoTIFF to a grid_size × grid_size grid and return a
    GeoJSON FeatureCollection where each feature is a polygon cell with IPCC
    Tier 1 carbon stock properties.

    Parameters
    ----------
    file_path : str
        Absolute path to an existing GeoTIFF file.
    grid_size : int
        Number of rows and columns in the output grid (default 50).

    Returns
    -------
    dict
        GeoJSON FeatureCollection with features containing:
            carbon_tco2e  – carbon stock in tCO₂e/ha (float, 2 dp)
            raw_value     – normalised pixel value 0–1 (float, 4 dp)
            row           – grid row index
            col           – grid column index
    """
    wgs84 = CRS.from_epsg(4326)

    with rasterio.open(file_path) as src:
        nodata = src.nodata

        # Resample band 1 to grid_size × grid_size
        resampled = src.read(
            1,
            out_shape=(grid_size, grid_size),
            resampling=Resampling.average,
        ).astype(np.float64)

        # Get WGS-84 bounds
        if src.crs is None or src.crs == wgs84:
            b = src.bounds
            west, south, east, north = b.left, b.bottom, b.right, b.top
        else:
            west, south, east, north = transform_bounds(src.crs, wgs84, *src.bounds)

    # Mask nodata
    if nodata is not None:
        resampled = np.where(resampled == nodata, np.nan, resampled)

    # Normalise 0–1
    valid_mask = np.isfinite(resampled)
    if not np.any(valid_mask):
        return {"type": "FeatureCollection", "features": []}

    valid_vals = resampled[valid_mask]
    v_min = float(np.nanmin(valid_vals))
    v_max = float(np.nanmax(valid_vals))

    cell_w = (east - west) / grid_size
    cell_h = (north - south) / grid_size

    features = []
    for row in range(grid_size):
        for col in range(grid_size):
            raw = resampled[row, col]
            if not np.isfinite(raw):
                continue  # skip nodata cells

            # Normalise
            if v_max > v_min:
                norm = (raw - v_min) / (v_max - v_min)
            else:
                norm = 0.0

            # IPCC Tier 1: carbon = norm * 160 * 0.47 * 3.67  tCO₂e/ha
            carbon = norm * _BIOMASS_TC_PER_HA * _CARBON_FRACTION * _CO2_FACTOR

            # Cell bounding box (WGS-84)
            x0 = west + col * cell_w
            x1 = x0 + cell_w
            # Rows go top-to-bottom → row 0 is the northernmost strip
            y1 = north - row * cell_h
            y0 = y1 - cell_h

            coordinates = [[
                [x0, y0],
                [x1, y0],
                [x1, y1],
                [x0, y1],
                [x0, y0],  # close ring
            ]]

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": coordinates,
                },
                "properties": {
                    "carbon_tco2e": round(carbon, 2),
                    "raw_value":    round(float(norm), 4),
                    "row":          row,
                    "col":          col,
                },
            })

    return {"type": "FeatureCollection", "features": features}
