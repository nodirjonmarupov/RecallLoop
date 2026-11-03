from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import get_db
from app.models import User

bearer_scheme=HTTPBearer(auto_error=False)

async def  get_current_user(
        credentials: Annotated[
            HTTPAuthorizationCredentials | None,
            Depends(bearer_scheme),
    ],

     db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
     if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

