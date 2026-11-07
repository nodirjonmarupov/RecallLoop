from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.engine import make_url
from app.api.deps import get_current_user
from app.database.base import Base
from app.database.session import get_db
from app.core.config import settings
from app.main import app
from app.models import User, Topic, Review

test_url = make_url(settings.database_url).set(database="recallloop_test")
test_engine = create_async_engine(test_url)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    expire_on_commit=False,
)

@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        email="test@example.com",
        hashed_password="test_password",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def authenticated_client(
    client: AsyncClient,
    test_user: User,
):
    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    yield client
