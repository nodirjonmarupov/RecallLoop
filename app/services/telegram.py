import httpx

from app.core.config import settings


async def send_telegram_message(chat_id: str, message: str) -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("Telegram bot token is not configured")
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            json={
                "chat_id": chat_id,
                "text": message,
            },
        )
        response.raise_for_status()

        data = response.json()

        if not data.get("ok"):
            error_description = data.get(
                "description",
                "Unknown Telegram error",
            )
            raise RuntimeError(
                f"Telegram message failed: {error_description}"
            )

      