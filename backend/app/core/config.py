import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXUS AI – Enterprise Intelligence Search"
    TAGLINE: str = "Turn Scattered Information into Instant Knowledge."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "nexus_ai_enterprise_super_secret_jwt_key_2026_x89a")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'nexus_ai.db')}")
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    VECTOR_STORE_DIR: str = os.path.join(BASE_DIR, "vector_store")
    
    # AI Search settings
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    DEFAULT_KEYWORD_WEIGHT: float = 0.4
    DEFAULT_SEMANTIC_WEIGHT: float = 0.6
    
    # Optional LLM API Keys for RAG (falls back cleanly to high-accuracy extractive reasoning if not provided)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True)

