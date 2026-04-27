"""add job_results and carbon_stock_readings

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # job_results — detailed per-job metrics from rasterio processing
    op.execute("""
        CREATE TABLE IF NOT EXISTS job_results (
            id VARCHAR PRIMARY KEY,
            job_id VARCHAR NOT NULL REFERENCES jobs(id),
            total_area_ha FLOAT,
            mean_ndvi FLOAT,
            carbon_stock_tco2e FLOAT,
            pixel_count INTEGER,
            resolution_m FLOAT,
            verified BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_job_results_job_id ON job_results (job_id)")

    # carbon_stock_readings — monthly time-series for analytics chart
    op.execute("""
        CREATE TABLE IF NOT EXISTS carbon_stock_readings (
            id VARCHAR PRIMARY KEY,
            month DATE NOT NULL,
            value FLOAT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_carbon_stock_readings_month ON carbon_stock_readings (month)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS carbon_stock_readings")
    op.execute("DROP TABLE IF EXISTS job_results")
