from pwdlib import PasswordHash
from datetime import UTC,datetime,timedelta
import jwt
from app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verifiy_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: str)-> str:
    expire=datetime.now(UTC)+ timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload={
        "sub":user_id,
        "exp":expire
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm="HS256",  
    )
