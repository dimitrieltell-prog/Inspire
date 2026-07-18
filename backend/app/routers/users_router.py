import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, get_optional_user, is_founder
from app.database import get_db
from app.models import ProfileUser, PublicProfile, StoryOut
from app.routers.stories_router import serialize_story

router = APIRouter(prefix="/users", tags=["users"])


def _profile_user(u: dict) -> ProfileUser:
    return ProfileUser(
        id=u["_id"],
        display_name=u["display_name"],
        is_premium=u.get("is_premium", False) or is_founder(u),
        is_founder=is_founder(u),
    )


async def _build_profile(u: dict, viewer: Optional[dict]) -> PublicProfile:
    db = get_db()
    followers = await db.follows.find({"following_id": u["_id"]})
    following = await db.follows.find({"follower_id": u["_id"]})
    stories = await db.stories.find({"author_id": u["_id"]})
    is_following = False
    if viewer:
        is_following = any(
            f["follower_id"] == viewer["_id"] and f["following_id"] == u["_id"] for f in followers
        )
    return PublicProfile(
        id=u["_id"],
        display_name=u["display_name"],
        is_premium=u.get("is_premium", False) or is_founder(u),
        is_founder=is_founder(u),
        follower_count=len(followers),
        following_count=len(following),
        story_count=len([s for s in stories if not s.get("is_anonymous")]),
        is_following=is_following,
        is_self=bool(viewer and viewer["_id"] == u["_id"]),
        created_at=u.get("created_at"),
    )


@router.get("/{user_id}", response_model=PublicProfile)
async def get_profile(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    return await _build_profile(user, viewer)


@router.get("/{user_id}/followers", response_model=list[ProfileUser])
async def list_followers(user_id: str):
    db = get_db()
    follows = await db.follows.find({"following_id": user_id})
    result = []
    for f in follows:
        u = await db.users.find_one({"_id": f["follower_id"]})
        if u:
            result.append(_profile_user(u))
    return result


@router.get("/{user_id}/following", response_model=list[ProfileUser])
async def list_following(user_id: str):
    db = get_db()
    follows = await db.follows.find({"follower_id": user_id})
    result = []
    for f in follows:
        u = await db.users.find_one({"_id": f["following_id"]})
        if u:
            result.append(_profile_user(u))
    return result


@router.post("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def follow_user(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't follow yourself.")
    db = get_db()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    existing = await db.follows.find_one({"follower_id": user["_id"], "following_id": user_id})
    if not existing:
        await db.follows.insert_one({
            "follower_id": user["_id"],
            "following_id": user_id,
            "created_at": time.time(),
        })


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(user_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.follows.delete_one({"follower_id": user["_id"], "following_id": user_id})


@router.get("/{user_id}/stories", response_model=list[StoryOut])
async def user_stories(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    stories = await db.stories.find({"author_id": user_id}, sort_key="created_at", reverse=True)
    is_owner = bool(viewer and viewer["_id"] == user_id)
    # Others only see non-anonymous posts; you see all of your own.
    visible = [s for s in stories if is_owner or not s.get("is_anonymous")]
    return [await serialize_story(s, viewer, db) for s in visible]


@router.get("/{user_id}/reposts", response_model=list[StoryOut])
async def user_reposts(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    reposts = await db.reposts.find({"user_id": user_id}, sort_key="created_at", reverse=True)
    result = []
    for r in reposts:
        story = await db.stories.find_one({"_id": r["story_id"]})
        if story:
            result.append(await serialize_story(story, viewer, db))
    return result


@router.get("/{user_id}/saved", response_model=list[StoryOut])
async def user_saved(user_id: str, viewer: dict = Depends(get_current_user)):
    # Saved is private -- only the owner can see their own saved stories.
    if viewer["_id"] != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    db = get_db()
    saves = await db.saves.find({"user_id": user_id}, sort_key="created_at", reverse=True)
    result = []
    for sv in saves:
        story = await db.stories.find_one({"_id": sv["story_id"]})
        if story:
            result.append(await serialize_story(story, viewer, db))
    return result
