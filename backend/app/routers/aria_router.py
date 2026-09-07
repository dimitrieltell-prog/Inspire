import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.aria_client import get_aria_reply
from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.first_circle import has_premium
from app.models import AriaMessageIn, AriaMessageOut

router = APIRouter(prefix="/aria", tags=["aria"])


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


@router.get("/usage", response_model=AriaMessageOut)
async def get_usage(user: dict = Depends(get_current_user)):
    """Check today's usage without sending a message -- used to render the meter on load."""
    db = get_db()
    usage = await db.aria_usage.find_one({"user_id": user["_id"], "date": _today_key()})
    used = usage["count"] if usage else 0
    is_premium = has_premium(user)
    limit = None if is_premium else settings.aria_free_daily_limit
    return AriaMessageOut(
        reply="",
        messages_used_today=used,
        daily_limit=limit,
        limit_reached=bool(limit) and used >= limit,
    )


@router.post("/chat", response_model=AriaMessageOut)
async def chat(payload: AriaMessageIn, user: dict = Depends(get_current_user)):
    db = get_db()
    is_premium = has_premium(user)
    limit = None if is_premium else settings.aria_free_daily_limit

    today = _today_key()
    usage = await db.aria_usage.find_one({"user_id": user["_id"], "date": today})
    used = usage["count"] if usage else 0

    if limit is not None and used >= limit:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"You've used all {limit} free Aria messages today. Upgrade to Premium for unlimited conversations.",
        )

    reply = await get_aria_reply(payload.message)

    if usage:
        usage = await db.aria_usage.update_one(
            {"user_id": user["_id"], "date": today}, {"$inc": {"count": 1}}
        )
    else:
        usage = await db.aria_usage.insert_one({
            "user_id": user["_id"], "date": today, "count": 1, "created_at": time.time(),
        })

    used = usage["count"]
    return AriaMessageOut(
        reply=reply,
        messages_used_today=used,
        daily_limit=limit,
        limit_reached=bool(limit) and used >= limit,
    )
