from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.database.session import get_db
from app.models import User
from app.schemas.user import UserCreate

router = APIRouter(prefix="/user", tags=["Users"])


@router.post("/")
async def create_user(
    user_data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "id": str(user.id),
        "email": user.email,
    }


@router.get("/me")
async def get_my_profile(current_user: Annotated[User, Depends(get_current_user)]):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
    }
