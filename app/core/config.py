from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "RecallLoop"
    app_env: str = "development"
    debug: bool = False
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30
    telegram_bot_token: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
