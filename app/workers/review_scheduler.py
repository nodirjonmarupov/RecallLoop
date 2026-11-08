
import asyncio
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.review import Review, ReviewStatus


async def check_due_reviews() -> None:
    today = datetime.now(UTC).date()

    async with SessionLocal() as db:
        result = await db.execute(
            select(Review)
            .join(Review.topic)
            .where(
                Review.review_date <= today,
                Review.status == ReviewStatus.PENDING,
                Review.sent_at.is_(None),
            )
            .order_by(Review.review_date)
        )

        due_reviews = result.scalars().all()

        print(
            f"Bugun yuborilishi kerak: {len(due_reviews)} ta review"
        )


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

    scheduler.start()
    print("Review scheduler ishga tushdi")

    try:
        await asyncio.Event().wait()
    finally:
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
