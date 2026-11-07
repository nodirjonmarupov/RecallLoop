from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TopicCreate(BaseModel):
    title: str


class TopicResponse(BaseModel):
    id: UUID
    title: str
    learned_at: date

    model_config = ConfigDict(from_attributes=True)


class TopicUpdate(BaseModel):
    title: str | None = None
