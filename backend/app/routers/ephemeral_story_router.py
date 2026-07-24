import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, get_optional_user, is_founder
from app.database import get_db
from app.models import (
    STORY_DURATIONS_FREE,
    STORY_DURATIONS_PREMIUM,
    EphemeralStoryCreate,
    EphemeralStoryOut,
    StoryReplyCreate,
    StoryReplyOut,
    StorySendCreate,
)
from app.moderation import contains_hostility
from app.routers.stories_router import _hidden_author_ids

router = APIRouter(prefix="/ephemeral-stories", tags=["ephemeral-stories"])


async def _expire_ephemeral_stories(db) -> None:
    """Stories are ephemeral by design -- sweep out anything past its expiry,
    along with its likes, replies, and sends, so it's gone everywhere."""
    now = time.time()
    expired = [s for s in await db.ephemeral_stories.find({}) if s.get("expires_at", 0) < now]
    for s in expired:
        sid = s["_id"]
        await db.story_likes.delete_many({"ephemeral_story_id": sid})
        await db.story_replies.delete_many({"ephemeral_story_id": sid})
        await db.story_sends.delete_many({"ephemeral_story_id": sid})
        await db.ephemeral_stories.delete_one({"_id": sid})


async def _can_view_ephemeral_story(db, story: dict, viewer: Optional[dict]) -> bool:
    author_id = story["author_id"]
    if viewer and (viewer["_id"] == author_id or is_founder(viewer)):
        return True
    if story.get("audience") == "close_circle":
        if not viewer:
            return False
        return bool(await db.close_circle.find_one({"owner_id": author_id, "member_id": viewer["_id"]}))
    author = await db.users.find_one({"_id": author_id})
    if author and author.get("is_private", False):
        if not viewer:
            return False
        return bool(await db.follows.find_one({"follower_id": viewer["_id"], "following_id": author_id}))
    return True


async def _serialize_ephemeral_story(story: dict, viewer: Optional[dict], db) -> EphemeralStoryOut:
    likes = await db.story_likes.find({"ephemeral_story_id": story["_id"]})
    is_liked = bool(viewer and any(l["user_id"] == viewer["_id"] for l in likes))
    reply_count = len(await db.story_replies.find({"ephemeral_story_id": story["_id"]}))
    return EphemeralStoryOut(
        id=story["_id"],
        author_id=story["author_id"],
        author_name=story["author_display_name"],
        body=story.get("body"),
        media_url=story.get("media_url"),
        media_type=story.get("media_type"),
        audience=story.get("audience", "everyone"),
        like_count=len(likes),
        is_liked=is_liked,
        reply_count=reply_count,
        expires_at=story["expires_at"],
        created_at=story["created_at"],
    )


@router.post("", response_model=EphemeralStoryOut, status_code=status.HTTP_201_CREATED)
async def create_ephemeral_story(payload: EphemeralStoryCreate, user: dict = Depends(get_current_user)):
    if not payload.body and not payload.media_url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A story needs a caption or media.")

    db = get_db()
    is_premium = user.get("is_premium", False) or is_founder(user)
    if payload.body and len(payload.body) > 500 and not is_premium:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Free accounts can write up to 500 characters — Premium allows up to 1000.")
    allowed = STORY_DURATIONS_PREMIUM if is_premium else STORY_DURATIONS_FREE
    duration_hours = payload.duration_hours if payload.duration_hours in allowed else allowed[0]

    now = time.time()
    story = await db.ephemeral_stories.insert_one({
        "author_id": user["_id"],
        "author_display_name": user["display_name"],
        "body": payload.body,
        "media_url": payload.media_url,
        "media_type": payload.media_type,
        "audience": payload.audience,
        "created_at": now,
        "expires_at": now + duration_hours * 3600,
    })
    return await _serialize_ephemeral_story(story, user, db)


@router.get("/by-user/{user_id}", response_model=list[EphemeralStoryOut])
async def list_user_stories(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    """A user's currently active Stories, in the order they were posted --
    what you see when you tap their avatar."""
    db = get_db()
    await _expire_ephemeral_stories(db)
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    stories = await db.ephemeral_stories.find({"author_id": user_id}, sort_key="created_at", reverse=False)
    hidden = await _hidden_author_ids(db, viewer)
    if user_id in hidden:
        return []
    visible = [s for s in stories if await _can_view_ephemeral_story(db, s, viewer)]
    return [await _serialize_ephemeral_story(s, viewer, db) for s in visible]


@router.get("/{story_id}", response_model=EphemeralStoryOut)
async def get_ephemeral_story(story_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    await _expire_ephemeral_stories(db)
    story = await db.ephemeral_stories.find_one({"_id": story_id})
    if not story or not await _can_view_ephemeral_story(db, story, viewer):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")
    return await _serialize_ephemeral_story(story, viewer, db)


async def _require_visible_story(db, story_id: str, viewer: Optional[dict]) -> dict:
    story = await db.ephemeral_stories.find_one({"_id": story_id})
    if not story or not await _can_view_ephemeral_story(db, story, viewer):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")
    return story


@router.post("/{story_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def like_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await _expire_ephemeral_stories(db)
    await _require_visible_story(db, story_id, user)
    existing = await db.story_likes.find_one({"ephemeral_story_id": story_id, "user_id": user["_id"]})
    if not existing:
        await db.story_likes.insert_one({"ephemeral_story_id": story_id, "user_id": user["_id"], "created_at": time.time()})


@router.delete("/{story_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def unlike_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.story_likes.delete_one({"ephemeral_story_id": story_id, "user_id": user["_id"]})


@router.get("/{story_id}/replies", response_model=list[StoryReplyOut])
async def list_story_replies(story_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    await _expire_ephemeral_stories(db)
    await _require_visible_story(db, story_id, viewer)
    replies = await db.story_replies.find({"ephemeral_story_id": story_id}, sort_key="created_at", reverse=False)
    hidden = await _hidden_author_ids(db, viewer)
    if hidden:
        replies = [r for r in replies if r.get("author_id") not in hidden]
    return [
        StoryReplyOut(
            id=r["_id"], ephemeral_story_id=r["ephemeral_story_id"],
            author_id=r["author_id"], author_name=r["author_display_name"],
            body=r["body"], created_at=r["created_at"],
        )
        for r in replies
    ]


@router.post("/replies", response_model=StoryReplyOut, status_code=status.HTTP_201_CREATED)
async def reply_to_story(payload: StoryReplyCreate, user: dict = Depends(get_current_user)):
    if contains_hostility(payload.body):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Let's keep this space respectful — please remove any hurtful language and try again.",
        )
    db = get_db()
    await _expire_ephemeral_stories(db)
    story = await _require_visible_story(db, payload.ephemeral_story_id, user)

    author_id = story["author_id"]
    if author_id != user["_id"]:
        if await db.blocks.find_one({"blocker_id": author_id, "blocked_id": user["_id"]}) or \
           await db.blocks.find_one({"blocker_id": user["_id"], "blocked_id": author_id}):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")

    reply = await db.story_replies.insert_one({
        "ephemeral_story_id": payload.ephemeral_story_id,
        "author_id": user["_id"],
        "author_display_name": user["display_name"],
        "body": payload.body,
        "created_at": time.time(),
    })
    return StoryReplyOut(
        id=reply["_id"], ephemeral_story_id=reply["ephemeral_story_id"],
        author_id=reply["author_id"], author_name=reply["author_display_name"],
        body=reply["body"], created_at=reply["created_at"],
    )


@router.post("/{story_id}/send", status_code=status.HTTP_204_NO_CONTENT)
async def send_story(story_id: str, payload: StorySendCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    await _expire_ephemeral_stories(db)
    story = await _require_visible_story(db, story_id, user)

    recipient = await db.users.find_one({"_id": payload.recipient_id})
    if not recipient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    if await db.blocks.find_one({"blocker_id": user["_id"], "blocked_id": payload.recipient_id}) or \
       await db.blocks.find_one({"blocker_id": payload.recipient_id, "blocked_id": user["_id"]}):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    author_id = story["author_id"]
    is_recipient_author = payload.recipient_id == author_id

    # A close-circle story can't be forwarded to someone outside the circle.
    if story.get("audience") == "close_circle" and not is_recipient_author:
        in_circle = await db.close_circle.find_one({"owner_id": author_id, "member_id": payload.recipient_id})
        if not in_circle:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This story can only be sent to the author's close circle.")

    # A private account's story can't be forwarded to someone who doesn't
    # already follow that account -- forwarding can't be used to bypass privacy.
    author = await db.users.find_one({"_id": author_id})
    if author and author.get("is_private", False) and not is_recipient_author:
        follows_author = await db.follows.find_one({"follower_id": payload.recipient_id, "following_id": author_id})
        if not follows_author:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This story can only be sent to people who follow the author.")

    await db.story_sends.insert_one({
        "ephemeral_story_id": story_id,
        "sender_id": user["_id"],
        "sender_name": user["display_name"],
        "recipient_id": payload.recipient_id,
        "created_at": time.time(),
    })
