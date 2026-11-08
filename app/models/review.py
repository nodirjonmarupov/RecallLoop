import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Uuid
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.topic import Topic

if TYPE_CHECKING:
    from app.models.topic import Topic


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"  # Kutilmoqda (hali takrorlanmagan)
    COMPLETED = "completed"  # Bajarildi (takrorlab bo'lingan)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("topics.id"),
        nullable=False,
    )

    review_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    status: Mapped[ReviewStatus] = mapped_column(
        SQLEnum(ReviewStatus, name="review_status"),
        default=ReviewStatus.PENDING,
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # keyinchalik Telegram xabari yuborilgan vaqtni qayd etish uchun.

    topic: Mapped["Topic"] = relationship(back_populates="reviews")
