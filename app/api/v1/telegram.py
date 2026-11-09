import secrets
import string
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models import User

router = APIRouter(prefix="/telegram", tags=["Telegram"])

class TelegramConnectResponse(BaseModel):
    code:str
    expires_in: int

@router.post("/connect",response_model=TelegramConnectResponse)
async def connect_telegram(
     db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    alphabet = string.ascii_uppercase + string.digits

    code= "RL"+"".join(
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

