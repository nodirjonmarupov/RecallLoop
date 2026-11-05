from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models import Topic, User
from app.schemas.topic import TopicCreate, TopicResponse

router = APIRouter(prefix="/topics", tags=["Topics"])


@router.post("/")
async def create_topic(
    topic_data: TopicCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    topic = Topic(
        title=topic_data.title,
        learned_at=date.today(),
        user=current_user,
    )

    db.add(topic)
    await db.commit()
    await db.refresh(topic)

    return {
        "id": str(topic.id),
        "title": topic.title,
        "user_id": str(topic.user_id),
    }


@router.get("/", response_model=list[TopicResponse])
async def get_my_topics(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(select(Topic).where(Topic.user_id == current_user.id))
    topics = result.scalars().all()

    return topics


@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic_id(
    topic_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Topic).where(
            Topic.id == topic_id,
            Topic.user_id == current_user.id,
        )
    )

    topic = result.scalar_one_or_none()

    if topic is None:
        raise HTTPException(
            status_code=404,
            detail="Topic not found",
        )
    return topic
