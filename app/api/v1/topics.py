from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.review_schedule import create_review_objects
from app.database.session import get_db
from app.models import Topic, User
from app.schemas.topic import TopicCreate, TopicResponse, TopicUpdate

router = APIRouter(prefix="/topics", tags=["Topics"])


@router.post("/", response_model=TopicResponse)
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

    reviews = create_review_objects(topic)

    db.add(topic)
    db.add_all(reviews)
    await db.commit()
    await db.refresh(topic)

    return topic


@router.get("/", response_model=TopicResponse)
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


@router.patch("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: UUID,
    topic_data: TopicUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == current_user.id)
    )
    topic = result.scalar_one_or_none()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    update_date = topic_data.model_dump(exclude_unset=True)
    for field, value in update_date.items():
        setattr(topic, field, value)

    await db.commit()
    await db.refresh(topic)

    return topic


@router.delete("/{topic_id}")
async def delete_topic(
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

    await db.delete(topic)
    await db.commit()

    return {"message": "Topic deleted successfully"}
