"""add result json and error_message to jobs

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-27 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add `result` JSON column to jobs — stores the full dict from tif_processor
    op.add_column(
        'jobs',
        sa.Column('result', sa.JSON(), nullable=True)
    )
    # error_message already exists (Text) in 0001; make sure String variant
    # is idempotent — only add if it doesn't already exist.
    # We use execute() so it's safe to run even if the column is there as TEXT.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='jobs' AND column_name='error_message'
            ) THEN
                ALTER TABLE jobs ADD COLUMN error_message VARCHAR;
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    op.drop_column('jobs', 'result')
    # We deliberately do NOT drop error_message here because it was added
    # in the initial schema (0001) and other code may depend on it.
