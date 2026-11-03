from fastapi import APIRouter,Depends,HTTPException
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import hash_password
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserRegister
from app.core.security import verifiy_password,create_access_token
from app.schemas.user import UserLogin

router=APIRouter(
    prefix="/auth",
    tags=["Auth"],
)

@router.post("/register")
async def register(
    user_data:UserRegister,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user=User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "id":str(user.id),
        "email":str(user.email)

    }

@router.post("/login")
async def login(
    user_data:UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result= await db.execute(
        select(User).where(User.email==user_data.email)
    )

    user=result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verifiy_password(user_data.password,user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    access_token=create_access_token(str(user.id))

    return {
    "access_token": access_token,
    "token_type": "bearer",
    }