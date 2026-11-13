
from datetime import UTC, datetime, timedelta

import pytest

from app.models import User
from app.core.config import settings


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


@pytest.mark.asyncio
async def test_telegram_webhook_connects_user(client, db_session, test_user, monkeypatch,):
    monkeypatch.setattr(
        settings,
        "telegram_webhook_secret",
        "test-webhook-secret",
    )
    test_user.telegram_link_code = "RL-ABC123"
    test_user.telegram_link_expires_at = (
        datetime.now(UTC) + timedelta(minutes=10)
    )
    await db_session.commit()
    response = await client.post(
        "/api/v1/telegram/webhook",
        json={
            "message": {
                "chat": {"id": 123456789},
                "text": "RL-ABC123",
            }
        },
        headers={
            "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
        },
        
    )
    

    assert response.status_code == 200
    assert test_user.telegram_chat_id == "123456789"
    assert test_user.telegram_link_code is None
    assert test_user.telegram_link_expires_at is None



@pytest.mark.asyncio
async def test_telegram_webhook_rejects_invalid_code(
    client, db_session, test_user,monkeypatch,
):
    monkeypatch.setattr(
        settings,
           "telegram_webhook_secret",
            "test-webhook-secret",
    )
    test_user.telegram_link_code = "RL-ABC123"
    test_user.telegram_link_expires_at = (
        datetime.now(UTC) + timedelta(minutes=10)
    )
    await db_session.commit()

    response = await client.post(
        "/api/v1/telegram/webhook",
        json={
            "message": {
                "chat": {"id": 123456789},
                "text": "RL-WRONG1",
            }
        },
        headers={
            "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Invalid or expired code"
    assert test_user.telegram_chat_id is None
    assert test_user.telegram_link_code == "RL-ABC123"


@pytest.mark.asyncio
async def test_telegram_webhook_rejects_expired_code(
    client, db_session, test_user,monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "telegram_webhook_secret",
        "test-webhook-secret",
    )

    test_user.telegram_link_code = "RL-ABC123"
    test_user.telegram_link_expires_at = (
        datetime.now(UTC) - timedelta(minutes=1)
    )
    await db_session.commit()

    response = await client.post(
        "/api/v1/telegram/webhook",
        json={
            "message": {
                "chat": {"id": 123456789},
                "text": "RL-ABC123",
            }
        },

        headers={
            "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Invalid or expired code"
    assert test_user.telegram_chat_id is None
    assert test_user.telegram_link_code == "RL-ABC123"


@pytest.mark.asyncio
async def test_telegram_webhook_rejects_already_connected_chat(
    client, db_session, test_user,monkeypatch
):
    monkeypatch.setattr(
        settings,
        "telegram_webhook_secret",
        "test-webhook-secret",
    )

    another_user = User(
        email="another@example.com",
        hashed_password="test_password",
        telegram_chat_id="123456789",
    )
    db_session.add(another_user)

    test_user.telegram_link_code = "RL-ABC123"
    test_user.telegram_link_expires_at = (
        datetime.now(UTC) + timedelta(minutes=10)
    )

    await db_session.commit()

    response = await client.post(
        "/api/v1/telegram/webhook",
        json={
            "message": {
                "chat": {"id": 123456789},
                "text": "RL-ABC123",
            }
        },
        headers={
            "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
        },
                
    )

    assert response.status_code == 200
    assert response.json()["message"] == (
        "This Telegram account is already connected"
    )
    assert test_user.telegram_chat_id is None
    assert test_user.telegram_link_code == "RL-ABC123"

@pytest.mark.asyncio
async def test_telegram_webhook_rejects_invalid_secret(
    client,
    monkeypatch,

):
    monkeypatch.setattr(
        settings,
        "telegram_webhook_secret",
        "test-webhook-secret",
    )
    response=await client.post(
        "/api/v1/telegram/webhook",
        json={
            "message": {
                "chat": {"id": 123456789},
                "text": "RL-ABC123",
            }
        },
        headers={
            "X-Telegram-Bot-Api-Secret-Token": "wrong-secret",
        },
    )

    assert response.status_code == 403


