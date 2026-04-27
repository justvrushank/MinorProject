"""initial_schema

Revision ID: 0001
Revises:
Create Date: 2026-04-23 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostGIS extension
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # 1. users
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR PRIMARY KEY,
            email VARCHAR NOT NULL,
            hashed_password VARCHAR NOT NULL,
            role VARCHAR DEFAULT 'analyst',
            status VARCHAR DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)")

    # 2. projects
    op.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            location VARCHAR,
            description VARCHAR,
            status VARCHAR DEFAULT 'active',
            geometry geometry(MULTIPOLYGON, 4326),
            created_by VARCHAR REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_projects_geometry ON projects USING gist (geometry)")

    # 3. jobs
    op.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id VARCHAR PRIMARY KEY,
            project_id VARCHAR NOT NULL REFERENCES projects(id),
            created_by VARCHAR REFERENCES users(id),
            file_name VARCHAR,
            file_path VARCHAR,
            error_message TEXT,
            status VARCHAR DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ
        )
    """)

    # 4. results (legacy — kept for backward compat)
    op.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id VARCHAR PRIMARY KEY,
            job_id VARCHAR NOT NULL UNIQUE REFERENCES jobs(id),
            carbon_stock_tco2e FLOAT,
            area_ha FLOAT,
            model_version VARCHAR DEFAULT 'v0.1-stub',
            geometry geometry(POLYGON, 4326),
            computed_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    # 5. verifications
    op.execute("""
        CREATE TABLE IF NOT EXISTS verifications (
            id VARCHAR PRIMARY KEY,
            job_id VARCHAR REFERENCES jobs(id),
            project_id VARCHAR REFERENCES projects(id),
            verifier_id VARCHAR REFERENCES users(id),
            status VARCHAR DEFAULT 'pending',
            notes VARCHAR,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    # 6. alerts
    op.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id VARCHAR PRIMARY KEY,
            type VARCHAR,
            severity VARCHAR DEFAULT 'info',
            title VARCHAR,
            message VARCHAR,
            status VARCHAR DEFAULT 'new',
            read BOOLEAN DEFAULT false,
            project_id VARCHAR REFERENCES projects(id),
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.drop_table('alerts')
    op.drop_table('verifications')
    op.drop_table('results')
    op.drop_table('jobs')
    op.drop_table('projects')
    op.drop_table('users')
