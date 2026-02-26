from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str
    rabbitmq_url: str

    llm_provider: str = "ollama"
    llm_model: str = "llama3.2"
    ollama_base_url: str = "http://ollama:11434"
    openai_api_key: Optional[str] = None

    rabbitmq_queue: str = "logs.analyze"
    rabbitmq_max_retries: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = False


def load_settings() -> Settings:
    return Settings()
