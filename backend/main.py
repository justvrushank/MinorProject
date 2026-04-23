"""
Blue Carbon MRV — FastAPI Backend
Serves the React-like frontend + REST API
Run: uvicorn backend.main:app --reload --port 8000
"""
import csv, json, re, shutil, uuid, os
from pathlib import Path
from collections import defaultdict
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent
CSV_PATH   = BASE_DIR / "mrv_results.csv"
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
FRONT_DIR  = BASE_DIR / "frontend"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Blue Carbon MRV", version="1.0.0")

# ── Helpers ────────────────────────────────────────────────────────────
def _parse_name(filename: str) -> dict:
    m = re.match(r"GMW_([NS])(\d+)([EW])(\d+)_(\d{4})_v\d+", Path(filename).stem)
    if not m:
        return {"lat": None, "lon": None, "year": None}
    ns, lat, ew, lon, year = m.groups()
    return {
        "lat": float(lat) * (1 if ns == "N" else -1),
        "lon": float(lon) * (1 if ew == "E" else -1),
        "year": int(year),
    }

def _load_csv() -> list[dict]:
    if not CSV_PATH.exists():
        return []
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            geo = _parse_name(row["File"])
            rows.append({
                "file":    row["File"],
                "area_ha": float(row.get("Area (ha)", 0) or 0),
                "carbon":  float(row.get("Carbon", 0) or 0),
                "risk":    row.get("Risk", "Unknown"),
                **geo,
            })
    return rows

# Load once at startup (fast enough for 1 600 rows)
DATA: list[dict] = _load_csv()

# ── Summary ────────────────────────────────────────────────────────────
@app.get("/api/summary")
def summary():
    rc = defaultdict(int)
    for r in DATA:
        rc[r["risk"]] += 1
    years = sorted({r["year"] for r in DATA if r["year"]})
    return {
        "total_files":    len(DATA),
        "total_area_ha":  round(sum(r["area_ha"] for r in DATA), 2),
        "total_carbon":   round(sum(r["carbon"]  for r in DATA), 2),
        "severe_count":   rc["Severe Loss"],
        "moderate_count": rc["Moderate"],
        "healthy_count":  rc["Healthy"],
        "years":          years,
    }

# ── Paginated results ──────────────────────────────────────────────────
@app.get("/api/results")
def results(
    page:   int = Query(1, ge=1),
    limit:  int = Query(50, ge=1, le=500),
    risk:   str = Query(""),
    year:   Optional[int] = Query(None),
    search: str = Query(""),
    sort:   str = Query("carbon"),
    order:  str = Query("desc"),
):
    rows = DATA[:]
    if risk:
        rows = [r for r in rows if r["risk"].lower() == risk.lower()]
    if year:
        rows = [r for r in rows if r["year"] == year]
    if search:
        s = search.lower()
        rows = [r for r in rows if s in r["file"].lower()]
    valid = {"area_ha", "carbon", "risk", "year", "file"}
    if sort in valid:
        rows.sort(key=lambda x: x[sort] or 0, reverse=(order == "desc"))
    total = len(rows)
    start = (page - 1) * limit
    return {
        "total":   total,
        "page":    page,
        "pages":   (total + limit - 1) // limit,
        "results": rows[start : start + limit],
    }

# ── Alerts ─────────────────────────────────────────────────────────────
@app.get("/api/alerts")
def alerts(
    severity: str = Query("all"),
    page:     int = Query(1, ge=1),
    limit:    int = Query(50, ge=1, le=200),
):
    rows = [r for r in DATA if r["risk"] in ("Severe Loss", "Moderate")]
    if severity == "severe":
        rows = [r for r in rows if r["risk"] == "Severe Loss"]
    elif severity == "moderate":
        rows = [r for r in rows if r["risk"] == "Moderate"]
    rows.sort(key=lambda x: (0 if x["risk"] == "Severe Loss" else 1, -(x["carbon"] or 0)))
    total = len(rows)
    start = (page - 1) * limit
    return {"total": total, "page": page, "pages": (total + limit - 1) // limit,
            "alerts": rows[start : start + limit]}

# ── Yearly chart data ──────────────────────────────────────────────────
@app.get("/api/chart/yearly")
def chart_yearly():
    by = defaultdict(lambda: {"area": 0.0, "carbon": 0.0, "severe": 0, "moderate": 0, "healthy": 0})
    for r in DATA:
        y = r["year"]
        if y is None:
            continue
        by[y]["area"]    += r["area_ha"]
        by[y]["carbon"]  += r["carbon"]
        key = {"Severe Loss": "severe", "Moderate": "moderate"}.get(r["risk"], "healthy")
        by[y][key] += 1
    return [
        {"year": y, "total_area_ha": round(d["area"], 2), "total_carbon": round(d["carbon"], 2),
         "severe": d["severe"], "moderate": d["moderate"], "healthy": d["healthy"]}
        for y, d in sorted(by.items())
    ]

# ── Risk distribution ─────────────────────────────────────────────────
@app.get("/api/chart/risk")
def chart_risk():
    rc = defaultdict(int)
    for r in DATA:
        rc[r["risk"]] += 1
    return {"Severe Loss": rc["Severe Loss"], "Moderate": rc["Moderate"], "Healthy": rc["Healthy"]}

# ── GeoJSON for Leaflet map ────────────────────────────────────────────
@app.get("/api/map/geojson")
def geojson(year: Optional[int] = Query(None)):
    rows = [r for r in DATA if r["lat"] is not None]
    if year:
        rows = [r for r in rows if r["year"] == year]
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
            "properties": {k: r[k] for k in ("file", "area_ha", "carbon", "risk", "year")},
        }
        for r in rows
    ]
    return {"type": "FeatureCollection", "features": features}

# ── Upload + process ──────────────────────────────────────────────────
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".tif"):
        raise HTTPException(400, "Only .tif files accepted")
    job_id   = str(uuid.uuid4())[:8]
    dst_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
    with open(dst_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        from backend.pipeline import process_file_full
        result = process_file_full(str(dst_path))
        return {"status": "success", "job_id": job_id, "result": result}
    except Exception as e:
        return {"status": "error", "job_id": job_id, "error": str(e)}

# ── Reload CSV (after upload) ─────────────────────────────────────────
@app.post("/api/reload")
def reload_data():
    global DATA
    DATA = _load_csv()
    return {"status": "reloaded", "total": len(DATA)}

# ── Serve frontend (must be LAST) ─────────────────────────────────────
app.mount("/", StaticFiles(directory=str(FRONT_DIR), html=True), name="static")
