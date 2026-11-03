from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models import Topic, User

router = APIRouter(prefix="/topics", tags=["Topics"])


@router.post("/")
async def create_topic(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(User).where(User.email == "test@example.com"))
    user = result.scalar_one()

    topic = Topic(title="Python OOP", learned_at=date.today(), user=user)

    db.add(topic)
    await db.commit()
    await db.refresh(topic)

    return {
        "id": str(topic.id),
        "title": topic.title,
        "user_id": str(topic.user_id),
    }
