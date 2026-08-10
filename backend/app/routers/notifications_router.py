from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse

from app.auth import get_current_user, verify_unsubscribe_token
from app.config import settings
from app.database import get_db
from app.models import NotificationOut
from app.notifications import run_digest_emails

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(user: dict = Depends(get_current_user)):
    db = get_db()
    notifs = await db.notifications.find({"recipient_id": user["_id"]}, sort_key="created_at", reverse=True)
    return [
        NotificationOut(
            id=n["_id"],
            type=n["type"],
            actor_id=n["actor_id"],
            actor_name=n["actor_name"],
            target_id=n.get("target_id"),
            preview=n.get("preview"),
            created_at=n["created_at"],
            read=n.get("read", False),
        )
        for n in notifs[:50]
    ]


@router.get("/unread-count")
async def unread_notification_count(user: dict = Depends(get_current_user)):
    db = get_db()
    count = len(await db.notifications.find({"recipient_id": user["_id"], "read": False}))
    return {"count": count}


@router.post("/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notifications_read(user: dict = Depends(get_current_user)):
    db = get_db()
    unread = await db.notifications.find({"recipient_id": user["_id"], "read": False})
    for n in unread:
        await db.notifications.update_one({"_id": n["_id"]}, {"$set": {"read": True}})


@router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(token: str):
    user_id = verify_unsubscribe_token(token)
    if not user_id:
        return HTMLResponse("<p>This unsubscribe link is invalid or has expired.</p>", status_code=400)
    db = get_db()
    await db.users.update_one({"_id": user_id}, {"$set": {"email_notifications": False}})
    return HTMLResponse("<p>You've been unsubscribed from Inspire email notifications. You can turn them back on anytime in Settings.</p>")


@router.get("/send-digests")
async def send_digests(key: str):
    # Same pattern as /admin/stats -- a secret-key-protected endpoint a cloud
    # scheduled routine can call daily, no login required.
    if not settings.admin_key or key != settings.admin_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    db = get_db()
    return await run_digest_emails(db)
