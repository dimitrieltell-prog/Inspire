import time

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.database import get_db
from app.models import StoryDraftOut, StoryDraftSave

router = APIRouter(prefix="/story-drafts", tags=["story-drafts"])


def _to_out(d: dict) -> StoryDraftOut:
    return StoryDraftOut(
        id=d["_id"],
        title=d.get("title") or "",
        body=d.get("body", ""),
        category=d.get("category"),
        is_anonymous=d.get("is_anonymous", False),
        tags=d.get("tags", []),
        media_url=d.get("media_url"),
        media_type=d.get("media_type"),
        created_at=d["created_at"],
        updated_at=d["updated_at"],
    )


@router.get("", response_model=list[StoryDraftOut])
async def list_drafts(user: dict = Depends(get_current_user)):
    db = get_db()
    drafts = await db.story_drafts.find({"author_id": user["_id"]}, sort_key="updated_at", reverse=True)
    return [_to_out(d) for d in drafts]


@router.post("", response_model=StoryDraftOut, status_code=status.HTTP_201_CREATED)
async def create_draft(payload: StoryDraftSave, user: dict = Depends(get_current_user)):
    db = get_db()
    now = time.time()
    draft = await db.story_drafts.insert_one({
        "author_id": user["_id"],
        "title": payload.title,
        "body": payload.body,
        "category": payload.category,
        "is_anonymous": payload.is_anonymous,
        "tags": payload.tags,
        "media_url": payload.media_url,
        "media_type": payload.media_type,
        "created_at": now,
        "updated_at": now,
    })
    return _to_out(draft)


async def _require_own_draft(db, draft_id: str, user: dict) -> dict:
    draft = await db.story_drafts.find_one({"_id": draft_id})
    if not draft or draft["author_id"] != user["_id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Draft not found.")
    return draft


@router.put("/{draft_id}", response_model=StoryDraftOut)
async def update_draft(draft_id: str, payload: StoryDraftSave, user: dict = Depends(get_current_user)):
    db = get_db()
    await _require_own_draft(db, draft_id, user)
    updated = await db.story_drafts.update_one({"_id": draft_id}, {"$set": {
        "title": payload.title,
        "body": payload.body,
        "category": payload.category,
        "is_anonymous": payload.is_anonymous,
        "tags": payload.tags,
        "media_url": payload.media_url,
        "media_type": payload.media_type,
        "updated_at": time.time(),
    }})
    return _to_out(updated)


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_draft(draft_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await _require_own_draft(db, draft_id, user)
    await db.story_drafts.delete_one({"_id": draft_id})
