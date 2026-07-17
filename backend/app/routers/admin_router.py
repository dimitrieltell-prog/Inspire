from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def stats(key: str):
    if not settings.admin_key or key != settings.admin_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    db = get_db()
    users = await db.users.find({})
    return {"user_count": len(users)}


@router.get("/users")
async def list_users(key: str):
    if not settings.admin_key or key != settings.admin_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    db = get_db()
    users = await db.users.find({})
    return {
        "users": [
            {
                "id": str(u["_id"]),
                "email": u["email"],
                "display_name": u["display_name"],
                "is_premium": u.get("is_premium", False),
                "is_founder": u.get("is_founder", False),
                "created_at": u.get("created_at"),
            }
            for u in users
        ]
    }
