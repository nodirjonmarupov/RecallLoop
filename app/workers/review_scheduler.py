import asyncio
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.session import SessionLocal
from app.models import Review, ReviewStatus,User,Topic
from app.services.telegram import send_telegram_message


async def check_due_reviews() -> None:
    today = datetime.now(UTC).date()

    async with SessionLocal() as db:
        result = await db.execute(
            select(Review)
            .join(Review.topic)
            .join(Review.topic.user)
            .options(
                selectinload(Review.topic).selectinload(Topic.user)
            )
            .where(
                Review.review_date <= today,
                Review.status == ReviewStatus.PENDING,
                Review.sent_at.is_(None),
                User.telegram_chat_id.is_not(None),
            )
            .order_by(Review.review_date)
        )

        due_reviews = result.scalars().all()

        for review in due_reviews:
            chat_id = review.topic.user.telegram_chat_id

            message = (
                f"📚 RecallLoop — Takrorlash vaqti!\n\n"
                f"Mavzu: {review.topic.title}\n"
                f"Bugun ushbu mavzuni takrorlash vaqti keldi."
            )

            await send_telegram_message(chat_id, message)
async def main() -> None:
    scheduler = AsyncIOScheduler(timezone="UTC")

    scheduler.add_job(
        check_due_reviews,
        trigger="cron",
        hour=0,
        minute=0,
        id="daily_review_notifications",
        replace_existing=True,
    )
    await check_due_reviews()

    scheduler.start()
    print("Review scheduler ishga tushdi")

    try:
        await asyncio.Event().wait()
    finally:
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
