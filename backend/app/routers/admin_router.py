import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import is_founder, require_founder
from app.config import settings
from app.database import get_db
from app.notifications import send_existing_user_intro_email, send_welcome_email

logger = logging.getLogger("inspire.admin")
router = APIRouter(prefix="/admin", tags=["admin"])


class BulkUserIds(BaseModel):
    user_ids: list[str]


@router.get("/stats")
async def stats(key: str):
    if not settings.admin_key or key != settings.admin_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    db = get_db()
    users = await db.users.find({})
    real_user_count = sum(1 for u in users if not u.get("is_test_account", False))
    return {"user_count": len(users), "real_user_count": real_user_count}


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
            "username": u.get("username"),
            "display_name": u["display_name"],
            "is_premium": u.get("is_premium", False) or founder_flag,
            "is_founder": founder_flag,
            "is_test_account": is_test,
            "created_at": u.get("created_at"),
            "last_active": u.get("last_active"),
            "first_session_start": u.get("first_session_start"),
            "first_session_end": u.get("first_session_end"),
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


@router.post("/users/bulk-mark-test")
async def bulk_mark_test_accounts(payload: BulkUserIds, founder: dict = Depends(require_founder)):
    db = get_db()
    marked = 0
    skipped_founders = 0
    for user_id in payload.user_ids:
        target = await db.users.find_one({"_id": user_id})
        if not target:
            continue
        if is_founder(target):
            skipped_founders += 1
            continue
        await db.users.update_one({"_id": user_id}, {"$set": {"is_test_account": True}})
        marked += 1
    return {"marked": marked, "skipped_founders": skipped_founders}


@router.delete("/users/{user_id}/intro-email-sent", status_code=status.HTTP_204_NO_CONTENT)
async def reset_intro_email_sent(user_id: str, founder: dict = Depends(require_founder)):
    # Recovery hatch: clears the "already emailed" flag on a user who got
    # marked despite the send itself failing (e.g. a mid-batch crash), so
    # the next bulk run picks them back up.
    db = get_db()
    await db.users.update_one({"_id": user_id}, {"$set": {"intro_email_sent": False}})


@router.post("/preview-welcome-email")
async def preview_welcome_email(founder: dict = Depends(require_founder)):
    # Sends the real new-user welcome template to the founder's own inbox,
    # so it can be reviewed before it goes anywhere near a real user.
    db = get_db()
    await send_welcome_email(db, founder)
    return {"sent_to": founder["email"]}


@router.post("/preview-intro-email")
async def preview_intro_email(founder: dict = Depends(require_founder)):
    db = get_db()
    await send_existing_user_intro_email(db, founder)
    return {"sent_to": founder["email"]}


@router.post("/send-intro-emails")
async def send_intro_emails(founder: dict = Depends(require_founder)):
    # One-time (but safely re-runnable) trigger: emails every account that
    # predates the founder-intro email and hasn't received one yet. New
    # signups already get it at registration, so intro_email_sent there
    # naturally excludes them going forward.
    db = get_db()
    users = await db.users.find({})
    sent = 0
    failed = []
    for u in users:
        if u.get("is_test_account", False) or is_founder(u) or u.get("intro_email_sent", False):
            continue
        try:
            await send_existing_user_intro_email(db, u)
            sent += 1
        except Exception:
            logger.exception("Failed to send intro email to %s", u.get("email"))
            failed.append(u["email"])
    return {"sent": sent, "failed": failed}
