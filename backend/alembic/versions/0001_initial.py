from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "users",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("email", sa.String, unique=True, nullable=False),
        sa.Column("hashed_password", sa.String, nullable=False),
        sa.Column("role", sa.String, server_default="analyst"),
        sa.Column("status", sa.String, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("location", sa.String),
        sa.Column("description", sa.String),
        sa.Column("status", sa.String, server_default="active"),
        sa.Column("geometry", Geometry("MULTIPOLYGON", srid=4326), nullable=True),
        sa.Column("created_by", sa.String, sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("project_id", sa.String, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("created_by", sa.String, sa.ForeignKey("users.id")),
        sa.Column("file_name", sa.String),
        sa.Column("status", sa.String, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "results",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("job_id", sa.String, sa.ForeignKey("jobs.id"), unique=True, nullable=False),
        sa.Column("carbon_stock_tco2e", sa.Float),
        sa.Column("area_ha", sa.Float),
        sa.Column("model_version", sa.String, server_default="v0.1-stub"),
        sa.Column("geometry", Geometry("POLYGON", srid=4326), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "verifications",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("job_id", sa.String, sa.ForeignKey("jobs.id")),
        sa.Column("project_id", sa.String, sa.ForeignKey("projects.id")),
        sa.Column("verifier_id", sa.String, sa.ForeignKey("users.id")),
        sa.Column("status", sa.String, server_default="pending"),
        sa.Column("notes", sa.String),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("type", sa.String),
        sa.Column("title", sa.String),
        sa.Column("message", sa.String),
        sa.Column("read", sa.Boolean, server_default="false"),
        sa.Column("project_id", sa.String, sa.ForeignKey("projects.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("alerts")
    op.drop_table("verifications")
    op.drop_table("results")
    op.drop_table("jobs")
    op.drop_table("projects")
    op.drop_table("users")
