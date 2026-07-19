from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_db
from app.models import ActivityItem, ProfileUser
from app.routers.users_router import _profile_user

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/activity", response_model=list[ActivityItem])
async def my_activity(user: dict = Depends(get_current_user)):
    """Everything you've done: support reactions given and replies left."""
    db = get_db()
    items = []

    for r in await db.reactions.find({"user_id": user["_id"]}):
        story = await db.stories.find_one({"_id": r["story_id"]})
        if story:
            items.append(ActivityItem(
                type="support",
                detail=r["reaction"],
                story_id=story["_id"],
                story_title=story["title"],
                created_at=r.get("created_at", 0),
            ))

    for c in await db.comments.find({"author_id": user["_id"]}):
        story = await db.stories.find_one({"_id": c["story_id"]})
        if story:
            items.append(ActivityItem(
                type="reply",
                detail=c["body"],
                story_id=story["_id"],
                story_title=story["title"],
                created_at=c.get("created_at", 0),
            ))

    items.sort(key=lambda i: i.created_at, reverse=True)
    return items


@router.get("/blocked", response_model=list[ProfileUser])
async def my_blocked(user: dict = Depends(get_current_user)):
    db = get_db()
    blocks = await db.blocks.find({"blocker_id": user["_id"]})
    result = []
    for b in blocks:
        u = await db.users.find_one({"_id": b["blocked_id"]})
        if u:
            result.append(_profile_user(u))
    return result


@router.get("/close-circle", response_model=list[ProfileUser])
async def my_close_circle(user: dict = Depends(get_current_user)):
    db = get_db()
    members = await db.close_circle.find({"owner_id": user["_id"]})
    result = []
    for m in members:
        u = await db.users.find_one({"_id": m["member_id"]})
        if u:
            result.append(_profile_user(u))
    return result
