from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import is_founder, require_founder
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
async def list_users(founder: dict = Depends(require_founder)):
    # Owner-only: access is tied to being signed in as a founder account, not a
    # shared key -- so nobody but the owner can ever read users' emails.
    db = get_db()
    users = await db.users.find({})
    result = []
    for u in users:
        founder = is_founder(u)
        result.append({
            "id": str(u["_id"]),
            "email": u["email"],
            "display_name": u["display_name"],
            "is_premium": u.get("is_premium", False) or founder,
            "is_founder": founder,
            "created_at": u.get("created_at"),
        })
    return {"users": result}
