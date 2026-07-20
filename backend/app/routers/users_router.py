import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, get_optional_user, is_founder
from app.database import get_db
from app.models import ProfileUser, PublicProfile, StoryOut
from app.routers.stories_router import _can_view_story, _expire_stories, serialize_story

router = APIRouter(prefix="/users", tags=["users"])


def _profile_user(u: dict) -> ProfileUser:
    return ProfileUser(
        id=u["_id"],
        display_name=u["display_name"],
        username=u.get("username"),
        is_premium=u.get("is_premium", False) or is_founder(u),
        is_founder=is_founder(u),
    )


async def _is_follower(db, viewer_id: str, target_id: str) -> bool:
    return bool(await db.follows.find_one({"follower_id": viewer_id, "following_id": target_id}))


async def can_view_account(db, target: dict, viewer: Optional[dict]) -> bool:
    """Private accounts are only visible to themselves, their followers, and the founder."""
    if not target.get("is_private", False):
        return True
    if not viewer:
        return False
    if viewer["_id"] == target["_id"] or is_founder(viewer):
        return True
    return await _is_follower(db, viewer["_id"], target["_id"])


async def _build_profile(u: dict, viewer: Optional[dict]) -> PublicProfile:
    db = get_db()
    followers = await db.follows.find({"following_id": u["_id"]})
    following = await db.follows.find({"follower_id": u["_id"]})
    stories = await db.stories.find({"author_id": u["_id"]})
    is_following = False
    is_blocked = False
    is_muted = False
    has_requested = False
    if viewer:
        is_following = any(
            f["follower_id"] == viewer["_id"] and f["following_id"] == u["_id"] for f in followers
        )
        is_blocked = bool(await db.blocks.find_one({"blocker_id": viewer["_id"], "blocked_id": u["_id"]}))
        is_muted = bool(await db.mutes.find_one({"muter_id": viewer["_id"], "muted_id": u["_id"]}))
        has_requested = bool(await db.follow_requests.find_one({"requester_id": viewer["_id"], "target_id": u["_id"]}))
    can_view = await can_view_account(db, u, viewer)
    # Private accounts still show the simple stuff -- name, username, bio --
    # but hide everything else from non-followers.
    return PublicProfile(
        id=u["_id"],
        display_name=u["display_name"],
        username=u.get("username"),
        bio=u.get("bio", ""),
        pronouns=u.get("pronouns", "") if can_view else "",
        links=u.get("links", []) if can_view else [],
        schools=u.get("schools", []) if can_view else [],
        is_premium=u.get("is_premium", False) or is_founder(u),
        is_founder=is_founder(u),
        is_private=u.get("is_private", False),
        is_business=u.get("is_business", False),
        business_category=u.get("business_category"),
        contact_email=u.get("contact_email") if u.get("is_business") else None,
        contact_website=u.get("contact_website") if u.get("is_business") else None,
        follower_count=len(followers),
        following_count=len(following),
        story_count=len([s for s in stories if not s.get("is_anonymous")]),
        is_following=is_following,
        is_self=bool(viewer and viewer["_id"] == u["_id"]),
        is_blocked=is_blocked,
        is_muted=is_muted,
        has_requested=has_requested,
        can_view=can_view,
        created_at=u.get("created_at"),
    )


@router.get("", response_model=list[ProfileUser])
async def search_users(q: str = "", viewer: Optional[dict] = Depends(get_optional_user)):
    """Search people by name or username (for close circle, mentions, etc.)."""
    q = q.strip().lower()
    if len(q) < 2:
        return []
    db = get_db()
    users = await db.users.find({})
    matches = [
        u for u in users
        if q in u.get("display_name", "").lower() or q in (u.get("username") or "").lower()
    ]
    # Don't surface people who blocked the viewer.
    if viewer:
        hidden = {b["blocker_id"] for b in await db.blocks.find({"blocked_id": viewer["_id"]})}
        matches = [u for u in matches if u["_id"] not in hidden]
    return [_profile_user(u) for u in matches[:15]]


@router.get("/{user_id}", response_model=PublicProfile)
async def get_profile(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    return await _build_profile(user, viewer)


@router.get("/{user_id}/followers", response_model=list[ProfileUser])
async def list_followers(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if not await can_view_account(db, target, viewer):
        return []
    follows = await db.follows.find({"following_id": user_id})
    result = []
    for f in follows:
        u = await db.users.find_one({"_id": f["follower_id"]})
        if u:
            result.append(_profile_user(u))
    return result


@router.get("/{user_id}/following", response_model=list[ProfileUser])
async def list_following(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if not await can_view_account(db, target, viewer):
        return []
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
    # Blocks (either direction) prevent following.
    if await db.blocks.find_one({"blocker_id": user["_id"], "blocked_id": user_id}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unblock this account to follow them.")
    if await db.blocks.find_one({"blocker_id": user_id, "blocked_id": user["_id"]}):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    existing = await db.follows.find_one({"follower_id": user["_id"], "following_id": user_id})
    if existing:
        return
    # Private accounts get a follow request they can approve or decline.
    if target.get("is_private", False):
        pending = await db.follow_requests.find_one({"requester_id": user["_id"], "target_id": user_id})
        if not pending:
            await db.follow_requests.insert_one({
                "requester_id": user["_id"],
                "target_id": user_id,
                "created_at": time.time(),
            })
        return
    await db.follows.insert_one({
        "follower_id": user["_id"],
        "following_id": user_id,
        "created_at": time.time(),
    })


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(user_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.follows.delete_one({"follower_id": user["_id"], "following_id": user_id})
    # Also cancels any pending follow request.
    await db.follow_requests.delete_one({"requester_id": user["_id"], "target_id": user_id})


@router.post("/{user_id}/mute", status_code=status.HTTP_204_NO_CONTENT)
async def mute_user(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't mute yourself.")
    db = get_db()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    existing = await db.mutes.find_one({"muter_id": user["_id"], "muted_id": user_id})
    if not existing:
        await db.mutes.insert_one({"muter_id": user["_id"], "muted_id": user_id, "created_at": time.time()})


@router.delete("/{user_id}/mute", status_code=status.HTTP_204_NO_CONTENT)
async def unmute_user(user_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.mutes.delete_one({"muter_id": user["_id"], "muted_id": user_id})


@router.post("/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def block_user(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't block yourself.")
    db = get_db()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    existing = await db.blocks.find_one({"blocker_id": user["_id"], "blocked_id": user_id})
    if not existing:
        await db.blocks.insert_one({
            "blocker_id": user["_id"],
            "blocked_id": user_id,
            "created_at": time.time(),
        })
    # Sever the relationship both ways.
    await db.follows.delete_one({"follower_id": user["_id"], "following_id": user_id})
    await db.follows.delete_one({"follower_id": user_id, "following_id": user["_id"]})
    await db.close_circle.delete_one({"owner_id": user["_id"], "member_id": user_id})
    await db.close_circle.delete_one({"owner_id": user_id, "member_id": user["_id"]})
    await db.follow_requests.delete_one({"requester_id": user["_id"], "target_id": user_id})
    await db.follow_requests.delete_one({"requester_id": user_id, "target_id": user["_id"]})


@router.delete("/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(user_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.blocks.delete_one({"blocker_id": user["_id"], "blocked_id": user_id})


@router.post("/{user_id}/close-circle", status_code=status.HTTP_204_NO_CONTENT)
async def add_to_close_circle(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't add yourself.")
    db = get_db()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if await db.blocks.find_one({"blocker_id": user["_id"], "blocked_id": user_id}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unblock this account first.")
    existing = await db.close_circle.find_one({"owner_id": user["_id"], "member_id": user_id})
    if not existing:
        await db.close_circle.insert_one({
            "owner_id": user["_id"],
            "member_id": user_id,
            "created_at": time.time(),
        })


@router.delete("/{user_id}/close-circle", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_close_circle(user_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.close_circle.delete_one({"owner_id": user["_id"], "member_id": user_id})


@router.get("/{user_id}/stories", response_model=list[StoryOut])
async def user_stories(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    await _expire_stories(db)
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if not await can_view_account(db, target, viewer):
        return []
    stories = await db.stories.find({"author_id": user_id}, sort_key="created_at", reverse=True)
    is_owner = bool(viewer and viewer["_id"] == user_id)
    # Others only see non-anonymous posts; you see all of your own.
    visible = [s for s in stories if is_owner or not s.get("is_anonymous")]
    visible = [s for s in visible if await _can_view_story(db, s, viewer)]
    return [await serialize_story(s, viewer, db) for s in visible]


@router.get("/{user_id}/reposts", response_model=list[StoryOut])
async def user_reposts(user_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    await _expire_stories(db)
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if not await can_view_account(db, target, viewer):
        return []
    reposts = await db.reposts.find({"user_id": user_id}, sort_key="created_at", reverse=True)
    result = []
    for r in reposts:
        story = await db.stories.find_one({"_id": r["story_id"]})
        # A story that expired (or is now close-circle-only and off-limits)
        # disappears from every repost of it too.
        if story and await _can_view_story(db, story, viewer):
            result.append(await serialize_story(story, viewer, db))
    return result
