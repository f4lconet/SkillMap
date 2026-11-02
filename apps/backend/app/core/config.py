from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str
    secret_key: str = Field(min_length=16)

    access_token_minutes: int = 15
    refresh_token_days: int = 30
    reset_token_minutes: int = 60

    cors_origins: list[str] = ["http://localhost:3000"]
    frontend_url: str = "http://localhost:3000"

    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_security: Literal["auto", "none", "starttls", "ssl"] = "auto"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    mail_from: str = "SkillMap <no-reply@skillmap.local>"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
