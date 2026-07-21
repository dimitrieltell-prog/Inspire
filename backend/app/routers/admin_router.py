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
async def list_users(include_test: bool = False, founder: dict = Depends(require_founder)):
    # Owner-only: access is tied to being signed in as a founder account, not a
    # shared key -- so nobody but the owner can ever read users' emails.
    db = get_db()
    users = await db.users.find({})
    result = []
    hidden_count = 0
    for u in users:
        is_test = u.get("is_test_account", False)
        if is_test and not include_test:
            hidden_count += 1
            continue
        founder_flag = is_founder(u)
        result.append({
            "id": str(u["_id"]),
            "email": u["email"],
            "display_name": u["display_name"],
            "is_premium": u.get("is_premium", False) or founder_flag,
            "is_founder": founder_flag,
            "is_test_account": is_test,
            "created_at": u.get("created_at"),
        })
    return {"users": result, "hidden_test_count": hidden_count}


@router.post("/users/{user_id}/mark-test", status_code=status.HTTP_204_NO_CONTENT)
async def mark_test_account(user_id: str, founder: dict = Depends(require_founder)):
    db = get_db()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if is_founder(target):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can't mark a founder account as a test account.")
    await db.users.update_one({"_id": user_id}, {"$set": {"is_test_account": True}})


@router.delete("/users/{user_id}/mark-test", status_code=status.HTTP_204_NO_CONTENT)
async def unmark_test_account(user_id: str, founder: dict = Depends(require_founder)):
    db = get_db()
    await db.users.update_one({"_id": user_id}, {"$set": {"is_test_account": False}})
