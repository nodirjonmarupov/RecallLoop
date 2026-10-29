from app.core.config import settings


def test_app_settings():
    assert settings.app_name == "RecallLoop"
    assert settings.app_env == "development"
    assert settings.debug is True
