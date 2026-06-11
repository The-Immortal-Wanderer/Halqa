"""Application configuration via pydantic-settings.

All environment variables are accessed through this module only.
Never use os.getenv() elsewhere in the codebase.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Anthropic
    anthropic_api_key: str

    # Web Push (VAPID)
    vapid_public_key: str
    vapid_private_key: str
    vapid_email: str

    # Internal service token
    internal_service_token: str

    # App config
    environment: Literal["development", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
