"""add telegram fields to users

Revision ID: a0410b7370cd
Revises: fb8710ac00cc
Create Date: 2026-11-09 16:01:17.881937

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a0410b7370cd'
down_revision: Union[str, Sequence[str], None] = 'fb8710ac00cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("telegram_chat_id", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("telegram_link_code", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "telegram_link_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_unique_constraint(
        "uq_users_telegram_chat_id",
        "users",
        ["telegram_chat_id"],
    )
    op.create_unique_constraint(
        "uq_users_telegram_link_code",
        "users",
        ["telegram_link_code"],
    )
def downgrade() -> None:
    op.drop_constraint(
        "uq_users_telegram_link_code",
        "users",
        type_="unique",
    )
    op.drop_constraint(
        "uq_users_telegram_chat_id",
        "users",
        type_="unique",
    )

    op.drop_column("users", "telegram_link_expires_at")
    op.drop_column("users", "telegram_link_code")
    op.drop_column("users", "telegram_chat_id")
    # ### end Alembic commands ###
