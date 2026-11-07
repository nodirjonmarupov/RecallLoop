from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models import ReviewStatus


class ReviewResponse(BaseModel):
    id: UUID
    topic_id: UUID
    review_date: date
    status: ReviewStatus
    completed_at: datetime | None
    sent_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ReviewHistoryResponse(BaseModel):
    id: UUID
    topic_id: UUID
    topic_title: str
    review_date: date
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)
