import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "ShelfWise ERP"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "shelfwise-super-secret-key-production-ready-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./shelfwise.db")
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "models"))
    DATA_DIR: str = os.getenv("DATA_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data"))

settings = Settings()
