from datetime import date

from app.core.review_schedule import (
    Topic,
    build_review_schedule,
    filter_due_dates,
    get_all_due_reviews,
    get_today,
    get_topic_due_reviews,
)


def test_calculate_review_dates():
    learned_at = date(2026, 10, 29)

    result = build_review_schedule(learned_at)
    assert result == [
        date(2026, 10, 30),
        date(2026, 11, 1),
        date(2026, 11, 5),
        date(2026, 11, 28),
    ]


def test_filter_due_dates():
    review_dates = [
        date(2026, 10, 30),
        date(2026, 11, 1),
        date(2026, 11, 5),
        date(2026, 11, 28),
    ]

    result = filter_due_dates(
        review_dates,
        date(2026, 11, 1),
    )

    assert result == [
        date(2026, 10, 30),
        date(2026, 11, 1),
    ]


def test_get_due_topic_reviews():
    result = get_topic_due_reviews(
        topic="Python list",
        learned_at=date(2026, 10, 29),
        today=date(2026, 11, 1),
    )

    assert result == [
        {
            "topic": "Python list",
            "review_date": "2026-10-30",
        },
        {
            "topic": "Python list",
            "review_date": "2026-11-01",
        },
    ]


def test_get_all_due_reviews():
    topics = [
        Topic(
            title="Python list",
            learned_at=date(2026, 10, 29),
        ),
        Topic(
            title="FastAPI routes",
            learned_at=date(2026, 10, 28),
        ),
    ]

    result = get_all_due_reviews(
        topics=topics,
        today=date(2026, 10, 30),
    )

    assert result == [
        {
            "topic": "Python list",
            "review_date": "2026-10-30",
        },
        {
            "topic": "FastAPI routes",
            "review_date": "2026-10-29",
        },
    ]


def test_future_reviews_are_not_returned():
    topics = [Topic(title="Learn pyhon_list", learned_at=date(2026, 10, 29))]
    result = get_all_due_reviews(topics=topics, today=date(2026, 10, 29))

    assert result == []


def test_get_today():
    result = get_today()

    assert result == date.today
