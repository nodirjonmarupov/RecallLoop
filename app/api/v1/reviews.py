from datetime import date, datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models import Review, ReviewStatus, Topic, User
from app.schemas.review import ReviewResponse

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/today", response_model=list[ReviewResponse])
async def get_today_reviews(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    today = date.today()

    result = await db.execute(
        select(Review)
        .join(Review.topic)
        .where(
            Topic.user_id == current_user.id,
            Review.review_date <= today,
            Review.status == ReviewStatus.PENDING,
        )
        .order_by(Review.review_date)
    )

    return result.scalars().all()


@router.patch("/{review_id}/complete", response_model=ReviewResponse)
async def complete_review(
    review_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Review)
        .join(Review.topic)
        .where(
            Review.id == review_id,
            Topic.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="Review not found",
        )

    if review.status == ReviewStatus.PENDING:
        review.status = ReviewStatus.COMPLETED
        review.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(review)

    return review
