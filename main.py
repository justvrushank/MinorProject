"""
Blue Carbon MRV Analytics Platform — FastAPI Backend
Phase 1: Three core endpoints

Run:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
import hashlib
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from pipeline import run_mrv

app = FastAPI(title="Blue Carbon MRV API", version="1.0.0")


# ─────────────────────────────────────────────
# 1. /run-mrv  — single TIFF upload
# ─────────────────────────────────────────────
@app.post("/run-mrv")
async def run_mrv_endpoint(file: UploadFile = File(...)):
    """
    Upload a single TIFF file.
    Returns MRV metrics: area, carbon, risk classification.
    """
    if not file.filename.lower().endswith(".tif"):
        raise HTTPException(status_code=400, detail="Only .tif files are accepted.")

    # Save upload to a temp file, process, then clean up
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = run_mrv(tmp_path, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")
    finally:
        os.unlink(tmp_path)

    return result


# ─────────────────────────────────────────────
# 2. /batch-run  — multiple files OR folder path
# ─────────────────────────────────────────────
@app.post("/batch-run")
async def batch_run_endpoint(
    files: List[UploadFile] = File(default=[]),
    folder_path: str = Form(default=""),
):
    """
    Upload multiple TIFF files  OR  provide a local folder path.
    Returns a list of MRV results for every .tif found.
    """
    results = []
    errors  = []

    # ── Option A: folder path on the server ──
    if folder_path:
        folder = Path(folder_path)
        if not folder.is_dir():
            raise HTTPException(status_code=400, detail=f"Folder not found: {folder_path}")

        tif_files = sorted(folder.glob("*.tif"))
        if not tif_files:
            raise HTTPException(status_code=404, detail="No .tif files found in the specified folder.")

        for tif in tif_files:
            try:
                results.append(run_mrv(str(tif), tif.name))
            except Exception as e:
                errors.append({"file": tif.name, "error": str(e)})

    # ── Option B: uploaded files ──
    elif files:
        tmp_dir = tempfile.mkdtemp()
        try:
            for upload in files:
                if not upload.filename.lower().endswith(".tif"):
                    errors.append({"file": upload.filename, "error": "Not a .tif file, skipped."})
                    continue

                dst = os.path.join(tmp_dir, upload.filename)
                with open(dst, "wb") as f:
                    shutil.copyfileobj(upload.file, f)

                try:
                    results.append(run_mrv(dst, upload.filename))
                except Exception as e:
                    errors.append({"file": upload.filename, "error": str(e)})
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'files' (multipart upload) or 'folder_path' (form field).",
        )

    response = {"results": results}
    if errors:
        response["errors"] = errors

    return JSONResponse(content=response)


# ─────────────────────────────────────────────
# 3. /verify  — SHA256 hash of MRV JSON result
# ─────────────────────────────────────────────
@app.post("/verify")
async def verify_endpoint(payload: dict):
    """
    Accept any JSON result from MRV endpoints.
    Returns a SHA256 hash for tamper-proof audit trail.
    """
    try:
        # Canonical JSON (sorted keys) ensures consistent hashing
        canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        sha256_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")

    return {
        "hash":   sha256_hash,
        "status": "verified",
    }
