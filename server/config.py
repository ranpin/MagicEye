from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    AI_PROVIDER: str = "mock"  # "anthropic", "gemini", "mock"
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    GEMINI_MODEL: str = "gemini-2.0-flash"
    MAX_IMAGE_SIZE: int = 2048
    LOG_LEVEL: str = "INFO"
    HOST: str = "0.0.0.0"
    PORT: int = 8000


settings = Settings()
