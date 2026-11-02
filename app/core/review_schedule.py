from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class Topic:
    title: str
    learned_at: date


REVIEW_INTERVALS = (1, 3, 7, 30)


def build_review_schedule(learned_at: date) -> list[date]:
    return [learned_at + timedelta(days=days) for days in REVIEW_INTERVALS]


def filter_due_dates(
    review_dates: list[date],
    today: date,
) -> list[date]:
    return [review_date for review_date in review_dates if review_date <= today]


def get_topic_due_reviews(
    topic: str,
    learned_at: date,
    today: date,
) -> list[dict[str, str]]:
    review_dates = build_review_schedule(learned_at)
    due_dates = filter_due_dates(review_dates, today)

    return [
        {
            "topic": topic,
            "review_date": review_date.isoformat(),
        }
        for review_date in due_dates
    ]


def get_all_due_reviews(
    topics: list[Topic],
    today: date,
) -> list[dict[str, str]]:
    due_reviews = []

    for topic in topics:
        due_reviews.extend(
            get_topic_due_reviews(
                topic=topic.title, learned_at=topic.learned_at, today=today
            )
        )

    return due_reviews


def get_today() -> date:
    return date.today
