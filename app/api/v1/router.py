from fastapi import APIRouter

from app.api.v1 import reviews
from app.api.v1.auth import router as auth_router
from app.api.v1.topics import router as topics_router
from app.api.v1.users import router as users_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(users_router)
api_router.include_router(topics_router)
api_router.include_router(auth_router)
api_router.include_router(reviews.router)
