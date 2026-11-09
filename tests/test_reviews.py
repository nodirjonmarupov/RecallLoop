from datetime import date, timedelta

import pytest
from httpx import AsyncClient

from app.models import Review, ReviewStatus, Topic


@pytest.mark.asyncio
async def test_get_today_reviews(
    authenticated_client: AsyncClient,
    db_session,
    test_user,
):
    today = date.today()

    topic = Topic(
        title="Python list",
        learned_at=today - timedelta(days=1),
        user=test_user,  # Mana shu bog‘lanish yetishmayotgan edi
    )

    due_review = Review(
        topic=topic,
        review_date=today,
        status=ReviewStatus.PENDING,
    )

    future_review = Review(
        topic=topic,
        review_date=today + timedelta(days=3),
        status=ReviewStatus.PENDING,
    )

    completed_review = Review(
        topic=topic,
        review_date=today - timedelta(days=1),
        status=ReviewStatus.COMPLETED,
    )

    db_session.add_all([topic, due_review, future_review, completed_review])
    await db_session.commit()

    response = await authenticated_client.get("/api/v1/reviews/today")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["topic_id"] == str(topic.id)
    assert data[0]["status"] == "pending"
    assert data[0]["review_date"] == today.isoformat()

    @pytest.mark.asyncio
    async def test_complete_review(
        authenticated_client: AsyncClient,
        db_session,
        test_user,
    ):
        today = date.today()

        topic = Topic(
            title="Python functions",
            learned_at=today - timedelta(days=1),
            user=test_user,
        )

        review = Review(
            topic=topic,
            review_date=today,
            status=ReviewStatus.PENDING,
        )

        db_session.add(topic)
        db_session.add(review)
        await db_session.commit()
        await db_session.refresh(review)

        response = await authenticated_client.patch(
            f"/api/v1/reviews/{review.id}/complete"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["status"] == "completed"
        assert data["completed_at"] is not None
