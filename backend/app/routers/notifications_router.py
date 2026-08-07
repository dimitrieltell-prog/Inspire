from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse

from app.auth import verify_unsubscribe_token
from app.config import settings
from app.database import get_db
from app.notifications import run_digest_emails

router = APIRouter(prefix="/notifications", tags=["notifications"])


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
