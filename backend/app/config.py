import os
from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes")


class Settings:
    use_mongo: bool = _bool("USE_MONGO")
    mongo_uri: str = os.getenv("MONGO_URI", "")
    mongo_db_name: str = os.getenv("MONGO_DB_NAME", "inspire")

    use_openai: bool = _bool("USE_OPENAI")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))

    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")

    aria_free_daily_limit: int = int(os.getenv("ARIA_FREE_DAILY_LIMIT", "5"))

    cors_origins: list = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]


settings = Settings()
