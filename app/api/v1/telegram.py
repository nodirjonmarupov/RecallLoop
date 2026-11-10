import secrets
import string
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models import User

from app.schemas.telegram import (
    TelegramConnectResponse,
    TelegramUpdate,
)

router = APIRouter(prefix="/telegram", tags=["Telegram"]) 


@router.post("/webhook")
async def telegram_webhook(
    update: TelegramUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # 1. Kelgan xabarni tekshirish
    if update.message is None or update.message.text is None:
        return {"message": "Invalid message"}

    code = update.message.text.strip()
    chat_id = str(update.message.chat.id)

    # 2. Kod egasini va amal qilish muddatini tekshirish
    result = await db.execute(
        select(User).where(
            User.telegram_link_code == code,
            User.telegram_link_expires_at > datetime.now(UTC),
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        return {"message": "Invalid or expired code"}

    # 3. Telegram akkaunti boshqa foydalanuvchiga bog‘langanmi?
    existing_result = await db.execute(
        select(User).where(
            User.telegram_chat_id == chat_id,
            User.id != user.id,
        )
    )

    existing_user = existing_result.scalar_one_or_none()

    if existing_user is not None:
        return {
            "message": "This Telegram account is already connected"
        }

    # 4. Telegram akkauntini foydalanuvchiga bog‘lash
    user.telegram_chat_id = chat_id

    # 5. Bir martalik kodni bekor qilish
    user.telegram_link_code = None
    user.telegram_link_expires_at = None

    await db.commit()

    return {"message": "Telegram connected successfully"}

@router.post("/connect",response_model=TelegramConnectResponse)
async def connect_telegram(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    alphabet = string.ascii_uppercase + string.digits

    code= "RL-"+"".join(
        secrets.choice(alphabet) for _ in range(6)
    )

    current_user.telegram_link_code=code
    current_user.telegram_link_expires_at = (
        datetime.now(UTC) + timedelta(minutes=10)
    )

    await db.commit()

    return TelegramConnectResponse(
        code=code,
        expires_in=600,
    )

