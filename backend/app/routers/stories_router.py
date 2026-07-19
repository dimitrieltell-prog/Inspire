import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, get_optional_user
from app.database import get_db
from app.models import REACTIONS, CommentCreate, CommentOut, ReactionCreate, StoryCreate, StoryOut
from app.moderation import contains_hostility

router = APIRouter(prefix="/stories", tags=["stories"])


async def serialize_story(story: dict, viewer, db) -> StoryOut:
    reposts = await db.reposts.find({"story_id": story["_id"]})
    is_saved = False
    is_reposted = False
    if viewer:
        is_saved = bool(await db.saves.find_one({"user_id": viewer["_id"], "story_id": story["_id"]}))
        is_reposted = any(r["user_id"] == viewer["_id"] for r in reposts)
    return StoryOut(
        id=story["_id"],
        title=story["title"],
        body=story["body"],
        category=story["category"],
        author_name="Anonymous" if story["is_anonymous"] else story["author_display_name"],
        author_id=None if story["is_anonymous"] else story.get("author_id"),
        is_anonymous=story["is_anonymous"],
        media_url=story.get("media_url"),
        media_type=story.get("media_type"),
        tags=story.get("tags", []),
        support_count=story.get("support_count", 0),
        comment_count=story.get("comment_count", 0),
        repost_count=len(reposts),
        is_saved=is_saved,
        is_reposted=is_reposted,
        created_at=story["created_at"],
    )


def _to_comment_out(comment: dict) -> CommentOut:
    return CommentOut(
        id=comment["_id"],
        story_id=comment["story_id"],
        author_name=comment["author_display_name"],
        author_id=comment.get("author_id"),
        body=comment["body"],
        created_at=comment["created_at"],
    )


@router.post("", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
async def create_story(payload: StoryCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    story = await db.stories.insert_one({
        "title": payload.title,
        "body": payload.body,
        "category": payload.category,
        "author_id": user["_id"],
        "author_display_name": user["display_name"],
        "is_anonymous": payload.is_anonymous,
        "media_url": payload.media_url,
        "media_type": payload.media_type,
        "tags": payload.tags,
        "support_count": 0,
        "comment_count": 0,
        "created_at": time.time(),
    })
    return await serialize_story(story, user, db)


async def _hidden_author_ids(db, viewer: Optional[dict]) -> set:
    """Authors whose content the viewer shouldn't see: people they blocked and
    people who blocked them."""
    if not viewer:
        return set()
    hidden = set()
    for b in await db.blocks.find({"blocker_id": viewer["_id"]}):
        hidden.add(b["blocked_id"])
    for b in await db.blocks.find({"blocked_id": viewer["_id"]}):
        hidden.add(b["blocker_id"])
    return hidden


@router.get("", response_model=list[StoryOut])
async def list_stories(category: Optional[str] = None, limit: int = 30, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    query = {"category": category} if category and category != "all" else {}
    stories = await db.stories.find(query, sort_key="created_at", reverse=True)
    hidden = await _hidden_author_ids(db, viewer)
    if hidden:
        stories = [s for s in stories if s.get("author_id") not in hidden]
    return [await serialize_story(s, viewer, db) for s in stories[:limit]]


@router.get("/{story_id}", response_model=StoryOut)
async def get_story(story_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    story = await db.stories.find_one({"_id": story_id})
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")
    return await serialize_story(story, viewer, db)


@router.get("/{story_id}/comments", response_model=list[CommentOut])
async def list_comments(story_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    comments = await db.comments.find({"story_id": story_id}, sort_key="created_at", reverse=False)
    hidden = await _hidden_author_ids(db, viewer)
    if hidden:
        comments = [c for c in comments if c.get("author_id") not in hidden]
    return [_to_comment_out(c) for c in comments]


@router.post("/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(payload: CommentCreate, user: dict = Depends(get_current_user)):
    if contains_hostility(payload.body):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Let's keep this space respectful — please remove any hurtful language and try again.",
        )

    db = get_db()
    story = await db.stories.find_one({"_id": payload.story_id})
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")

    comment = await db.comments.insert_one({
        "story_id": payload.story_id,
        "author_id": user["_id"],
        "author_display_name": user["display_name"],
        "body": payload.body,
        "created_at": time.time(),
    })
    await db.stories.update_one({"_id": payload.story_id}, {"$inc": {"comment_count": 1}})
    return _to_comment_out(comment)


@router.post("/react", status_code=status.HTTP_204_NO_CONTENT)
async def react_to_story(payload: ReactionCreate, user: dict = Depends(get_current_user)):
    if payload.reaction not in REACTIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Reaction must be one of: {', '.join(REACTIONS)}")

    db = get_db()
    story = await db.stories.find_one({"_id": payload.story_id})
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")

    # one reaction per user per story -- update if it already exists, else create + increment
    existing = await db.reactions.find_one({"story_id": payload.story_id, "user_id": user["_id"]})
    if existing:
        await db.reactions.update_one(
            {"story_id": payload.story_id, "user_id": user["_id"]},
            {"$set": {"reaction": payload.reaction}},
        )
    else:
        await db.reactions.insert_one({
            "story_id": payload.story_id,
            "user_id": user["_id"],
            "reaction": payload.reaction,
            "created_at": time.time(),
        })
        await db.stories.update_one({"_id": payload.story_id}, {"$inc": {"support_count": 1}})


async def _require_story(db, story_id: str) -> dict:
    story = await db.stories.find_one({"_id": story_id})
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")
    return story


@router.post("/{story_id}/repost", status_code=status.HTTP_204_NO_CONTENT)
async def repost_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await _require_story(db, story_id)
    existing = await db.reposts.find_one({"story_id": story_id, "user_id": user["_id"]})
    if not existing:
        await db.reposts.insert_one({"story_id": story_id, "user_id": user["_id"], "created_at": time.time()})


@router.delete("/{story_id}/repost", status_code=status.HTTP_204_NO_CONTENT)
async def unrepost_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.reposts.delete_one({"story_id": story_id, "user_id": user["_id"]})


@router.post("/{story_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def save_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await _require_story(db, story_id)
    existing = await db.saves.find_one({"story_id": story_id, "user_id": user["_id"]})
    if not existing:
        await db.saves.insert_one({"story_id": story_id, "user_id": user["_id"], "created_at": time.time()})


@router.delete("/{story_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.saves.delete_one({"story_id": story_id, "user_id": user["_id"]})
