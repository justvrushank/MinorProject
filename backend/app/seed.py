"""
Seed script for Blue Carbon MRV Platform.
Run with: docker compose exec backend python -m app.seed
Fully idempotent — safe to run multiple times.
"""
import asyncio
import uuid
from datetime import date, datetime, timezone
from dateutil.parser import parse as parse_dt

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.security import hash_password

# ---------------------------------------------------------------------------
# Engine (async)
# ---------------------------------------------------------------------------
engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def uid() -> str:
    return str(uuid.uuid4())


async def exec(session, sql: str, params: dict) -> None:
    await session.execute(text(sql), params)


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------
USERS = [
    {"id": uid(), "email": "admin@test.com",  "password": "admin123",   "role": "admin",    "status": "active"},
    {"id": uid(), "email": "asha@bcmrv.org",  "password": "analyst123", "role": "analyst",  "status": "active"},
    {"id": uid(), "email": "viyer@bcmrv.org", "password": "verify123",  "role": "verifier", "status": "active"},
    {"id": uid(), "email": "admin@bcmrv.org", "password": "admin123",   "role": "admin",    "status": "active"},
    {"id": uid(), "email": "rohit@bcmrv.org", "password": "analyst123", "role": "analyst",  "status": "suspended"},
]

PROJECTS = [
    {"id": "p_001", "name": "Sundarbans Mangrove Restoration", "location": "West Bengal, India", "status": "active",   "created_at": "2024-11-12T09:24:00+00:00"},
    {"id": "p_002", "name": "Pichavaram Coastal Wetlands",     "location": "Tamil Nadu, India",  "status": "active",   "created_at": "2025-01-05T14:11:00+00:00"},
    {"id": "p_003", "name": "Bhitarkanika Conservation Zone",  "location": "Odisha, India",      "status": "active",   "created_at": "2025-02-18T11:02:00+00:00"},
    {"id": "p_004", "name": "Gulf of Mannar Seagrass",         "location": "Tamil Nadu, India",  "status": "draft",    "created_at": "2025-03-22T07:45:00+00:00"},
    {"id": "p_005", "name": "Chilika Lagoon Survey",           "location": "Odisha, India",      "status": "archived", "created_at": "2024-09-30T18:00:00+00:00"},
]

# project_name → project_id map
PROJECT_MAP = {p["name"]: p["id"] for p in PROJECTS}

JOBS = [
    {"id": "j_1038", "project": "Pichavaram Coastal Wetlands",     "file": "pichavaram_q1.tif",         "status": "complete", "created_at": "2025-04-10T12:30:00+00:00"},
    {"id": "j_1039", "project": "Sundarbans Mangrove Restoration", "file": "sundarbans_partial.tif",    "status": "failed",   "created_at": "2025-04-15T05:40:00+00:00"},
    {"id": "j_1040", "project": "Bhitarkanika Conservation Zone",  "file": "bhitarkanika_baseline.tif", "status": "pending",  "created_at": "2025-04-23T08:14:00+00:00"},
    {"id": "j_1041", "project": "Pichavaram Coastal Wetlands",     "file": "pichavaram_apr.tif",        "status": "running",  "created_at": "2025-04-22T16:02:00+00:00"},
    {"id": "j_1042", "project": "Sundarbans Mangrove Restoration", "file": "sundarbans_2025_q2.tif",   "status": "complete", "created_at": "2025-04-18T10:11:00+00:00"},
]

ALERTS = [
    {
        "id": uid(),
        "title": "Carbon stock anomaly detected",
        "message": "Bhitarkanika plot 12 reports a 14% drop vs. previous quarter. Manual review required.",
        "type": "critical", "severity": "critical", "status": "new",
        "read": False,
        "created_at": "2025-04-22T07:12:00+00:00",
    },
    {
        "id": uid(),
        "title": "GeoTIFF resolution below threshold",
        "message": "Uploaded raster for Pichavaram is 30m/px (recommended <= 10m/px).",
        "type": "warning", "severity": "warning", "status": "new",
        "read": False,
        "created_at": "2025-04-21T14:48:00+00:00",
    },
    {
        "id": uid(),
        "title": "Verification approved",
        "message": "Sundarbans Q1 result verified by V. Iyer.",
        "type": "info", "severity": "info", "status": "read",
        "read": True,
        "created_at": "2025-04-19T09:00:00+00:00",
    },
]

CARBON_READINGS = [
    {"id": uid(), "month": date(2024, 11, 1), "value": 18400.0},
    {"id": uid(), "month": date(2024, 12, 1), "value": 20100.0},
    {"id": uid(), "month": date(2025,  1, 1), "value": 21800.0},
    {"id": uid(), "month": date(2025,  2, 1), "value": 23500.0},
    {"id": uid(), "month": date(2025,  3, 1), "value": 26000.0},
    {"id": uid(), "month": date(2025,  4, 1), "value": 28200.0},
]

JOB_RESULTS = [
    {
        "id": uid(), "job_id": "j_1038",
        "total_area_ha": 318.4, "carbon_stock_tco2e": 13532.0,
        "mean_ndvi": 0.68, "pixel_count": 31840, "resolution_m": 10.0, "verified": True,
    },
    {
        "id": uid(), "job_id": "j_1042",
        "total_area_ha": 612.3, "carbon_stock_tco2e": 26022.75,
        "mean_ndvi": 0.74, "pixel_count": 61230, "resolution_m": 10.0, "verified": True,
    },
]


# ---------------------------------------------------------------------------
# Main seed function
# ---------------------------------------------------------------------------
async def seed():
    async with AsyncSession() as session:
        async with session.begin():
            # ---- users ----
            for u in USERS:
                hashed = hash_password(u["password"])
                await exec(
                    session,
                    """
                    INSERT INTO users (id, email, hashed_password, role, status)
                    VALUES (:id, :email, :hashed_password, :role, :status)
                    ON CONFLICT (email) DO NOTHING
                    """,
                    {
                        "id": u["id"],
                        "email": u["email"],
                        "hashed_password": hashed,
                        "role": u["role"],
                        "status": u["status"],
                    },
                )

            # ---- projects (need a created_by; pick the first admin user id) ----
            admin_id = USERS[0]["id"]
            for p in PROJECTS:
                await exec(
                    session,
                    """
                    INSERT INTO projects (id, name, location, status, created_by, created_at)
                    VALUES (:id, :name, :location, :status, :created_by, :created_at)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    {
                        "id": p["id"],
                        "name": p["name"],
                        "location": p["location"],
                        "status": p["status"],
                        "created_by": admin_id,
                        "created_at": parse_dt(p["created_at"]),
                    },
                )

            # ---- jobs ----
            for j in JOBS:
                project_id = PROJECT_MAP[j["project"]]
                await exec(
                    session,
                    """
                    INSERT INTO jobs (id, project_id, created_by, file_name, status, created_at)
                    VALUES (:id, :project_id, :created_by, :file_name, :status, :created_at)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    {
                        "id": j["id"],
                        "project_id": project_id,
                        "created_by": admin_id,
                        "file_name": j["file"],
                        "status": j["status"],
                        "created_at": parse_dt(j["created_at"]),
                    },
                )

            # ---- alerts ----
            for a in ALERTS:
                await exec(
                    session,
                    """
                    INSERT INTO alerts (id, type, severity, title, message, status, read, created_at)
                    VALUES (:id, :type, :severity, :title, :message, :status, :read, :created_at)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    {
                        "id": a["id"],
                        "type": a["type"],
                        "severity": a["severity"],
                        "title": a["title"],
                        "message": a["message"],
                        "status": a["status"],
                        "read": a["read"],
                        "created_at": parse_dt(a["created_at"]),
                    },
                )

            # ---- carbon stock readings ----
            for r in CARBON_READINGS:
                await exec(
                    session,
                    """
                    INSERT INTO carbon_stock_readings (id, month, value)
                    VALUES (:id, :month, :value)
                    ON CONFLICT (month) DO NOTHING
                    """,
                    {"id": r["id"], "month": r["month"], "value": r["value"]},
                )

            # ---- job results ----
            for jr in JOB_RESULTS:
                await exec(
                    session,
                    """
                    INSERT INTO job_results (id, job_id, total_area_ha, mean_ndvi,
                        carbon_stock_tco2e, pixel_count, resolution_m, verified)
                    VALUES (:id, :job_id, :total_area_ha, :mean_ndvi,
                        :carbon_stock_tco2e, :pixel_count, :resolution_m, :verified)
                    ON CONFLICT (job_id) DO NOTHING
                    """,
                    jr,
                )

    print("✅ Seeded successfully!")
    print(f"   Users:                 {len(USERS)}")
    print(f"   Projects:              {len(PROJECTS)}")
    print(f"   Jobs:                  {len(JOBS)}")
    print(f"   Alerts:                {len(ALERTS)}")
    print(f"   Carbon stock readings: {len(CARBON_READINGS)}")
    print(f"   Job results:           {len(JOB_RESULTS)}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
