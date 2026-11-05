from pydantic import BaseModel


class TopicCreate(BaseModel):
    title: str