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

    stripe_secret_key: str = os.getenv("STRIPE_SECRET_KEY", "")
    stripe_price_id: str = os.getenv("STRIPE_PRICE_ID", "")
    stripe_webhook_secret: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    aria_free_daily_limit: int = int(os.getenv("ARIA_FREE_DAILY_LIMIT", "5"))

    cors_origins: list = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    admin_key: str = os.getenv("ADMIN_KEY", "")

    # Emails that always get founder status (and premium for free), regardless of
    # what's stored in the DB -- makes the owner's badges permanent. Comma-separated.
    founder_emails: set = {
        e.strip().lower() for e in os.getenv("FOUNDER_EMAILS", "").split(",") if e.strip()
    }


settings = Settings()
