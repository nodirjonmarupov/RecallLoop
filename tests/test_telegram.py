
from datetime import UTC, datetime, timedelta

import pytest

from app.models import User


@pytest.mark.asyncio
async def test_connect_telegram_success(authenticated_client, test_user):
    before_request = datetime.now(UTC)

    response = await authenticated_client.post("/api/v1/telegram/connect")

    after_request = datetime.now(UTC)

    assert response.status_code == 200

    data = response.json()

    assert data["code"].startswith("RL-")
    assert len(data["code"]) == 9
    assert data["expires_in"] == 600

    assert test_user.telegram_link_code == data["code"]

    expires_at = test_user.telegram_link_expires_at

    assert expires_at is not None
    assert before_request + timedelta(minutes=10) <= expires_at
    assert expires_at <= after_request + timedelta(minutes=10)


@pytest.mark.asyncio
async def test_connect_telegram_requires_authentication(client):
    response = await client.post("/api/v1/telegram/connect")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_connect_telegram_replaces_old_code(
    authenticated_client,
    test_user,
    monkeypatch,
):
    from app.api.v1 import telegram

    generated_codes = iter("ABCDEFGHIJKL")

    monkeypatch.setattr(
        telegram.secrets,
        "choice",
        lambda alphabet: next(generated_codes),
    )

    first_response = await authenticated_client.post(
        "/api/v1/telegram/connect"
    )

    first_code = first_response.json()["code"]

    second_response = await authenticated_client.post(
        "/api/v1/telegram/connect"
    )

    second_code = second_response.json()["code"]

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_code != second_code
    assert test_user.telegram_link_code == second_code
