import time

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, is_founder
from app.database import get_db
from app.first_circle import has_premium
from app import first_circle
from app.inapp_notifications import create_system_notification
from app.models import (
    ActivityItem,
    FirstCircleState,
    FirstCircleStep,
    FounderStoryViewCreate,
    FounderStoryViewOut,
    Insights,
    OnboardingChecklist,
    OnboardingStep,
    ProfileUser,
    StoryInboxItem,
)
from app.notifications import notify_new_follower
from app.routers.ephemeral_story_router import _expire_ephemeral_stories, _serialize_ephemeral_story
from app.routers.stories_router import story_display_name
from app.routers.users_router import _profile_user

router = APIRouter(prefix="/me", tags=["me"])


@router.post("/founder-story-seen", status_code=204)
async def mark_founder_story_seen(user: dict = Depends(get_current_user)):
    """One-time popup shown after login/signup -- once dismissed, never again."""
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"has_seen_founder_story": True}})


@router.post("/founder-story-view", status_code=204)
async def record_founder_story_view(payload: FounderStoryViewCreate, user: dict = Depends(get_current_user)):
    """Logged once per close of the founder-story popup, for the founder's
    own read on who's actually reading it. Skips the founder's own views of
    his own story -- nothing useful to learn from tracking those."""
    if is_founder(user):
        return
    await get_db().founder_story_views.insert_one({
        "viewer_id": user["_id"],
        "viewer_name": user.get("display_name", "Someone"),
        "viewed_at": time.time(),
        "duration_seconds": payload.duration_seconds,
    })


@router.get("/founder-story-views", response_model=list[FounderStoryViewOut])
async def list_founder_story_views(user: dict = Depends(get_current_user)):
    if not is_founder(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Founder only.")
    views = await get_db().founder_story_views.find({}, sort_key="viewed_at", reverse=True)
    return [
        FounderStoryViewOut(viewer_name=v["viewer_name"], viewed_at=v["viewed_at"], duration_seconds=v["duration_seconds"])
        for v in views
    ]


@router.post("/onboarding-guide-seen", status_code=204)
async def mark_onboarding_guide_seen(user: dict = Depends(get_current_user)):
    """One-time popup version of the getting-started checklist -- shown once,
    then the same steps only ever appear as the inline card on Stories."""
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"has_seen_onboarding_guide": True}})


@router.post("/story-premium-pitch-seen", status_code=204)
async def mark_story_premium_pitch_seen(user: dict = Depends(get_current_user)):
    """One-time nudge shown right after the founder-story popup, before the
    getting-started guide -- pointing free accounts at Premium as the way to
    reopen the story later. Founder/Premium accounts skip this in the
    gating chain since they already have permanent access."""
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"has_seen_story_premium_pitch": True}})


@router.get("/onboarding", response_model=OnboardingChecklist)
async def my_onboarding_checklist(user: dict = Depends(get_current_user)):
    """Getting-started checklist -- each step is detected from real usage,
    then remembered once it happens.

    Detection alone isn't enough: it describes the CURRENT state, so
    undoing the underlying action used to un-tick the step and bring the
    whole checklist back. Deleting your only post would greet you with the
    new-user guide again. Completing a step is a moment in time, not a
    state to maintain, so each one is latched here the first time it's
    seen and never re-evaluated after that."""
    db = get_db()
    uid = user["_id"]
    if user.get("onboarding_dismissed"):
        return OnboardingChecklist(steps=[], complete=True)
    latched = set(user.get("onboarding_done") or [])
    live = {
        "story": bool(await db.stories.find_one({"author_id": uid})),
        "profile": bool(user.get("avatar_url") or user.get("bio")),
        "follow": bool(await db.follows.find_one({"follower_id": uid})),
        "aria": bool(await db.aria_usage.find_one({"user_id": uid})),
    }
    newly_done = {k for k, v in live.items() if v} - latched
    if newly_done:
        latched |= newly_done
        await db.users.update_one({"_id": uid}, {"$set": {"onboarding_done": sorted(latched)}})

    has_story = "story" in latched
    has_profile = "profile" in latched
    has_follow = "follow" in latched
    has_aria = "aria" in latched
    steps = [
        OnboardingStep(
            key="story", title="Share your first story",
            subtitle="Writing something real is the best way to see what Inspire's about.",
            done=has_story, cta_url="/stories/new",
        ),
        OnboardingStep(
            key="profile", title="Set up your profile",
            subtitle="Add a photo or a bit about yourself.",
            done=has_profile, cta_url="/profile",
        ),
        OnboardingStep(
            key="follow", title="Follow someone",
            subtitle="Find a friend or discover new stories.",
            done=has_follow, cta_url="/stories",
        ),
        OnboardingStep(
            key="aria", title="Say hi to Aria",
            subtitle="A reflective AI companion, here if you want to think something through.",
            done=has_aria, cta_url="/aria",
        ),
    ]
    return OnboardingChecklist(steps=steps, complete=all(s.done for s in steps))


@router.get("/first-circle", response_model=FirstCircleState)
async def my_first_circle(user: dict = Depends(get_current_user)):
    """Where you stand with the First Circle, and the place itself if this
    is the moment you've earned one.

    Admission happens here rather than at the end of each qualifying action
    because the final step -- coming back on a third day -- isn't an action
    at all. Whatever someone does, they finish by loading a page, so this is
    the one place guaranteed to run.
    """
    db = get_db()
    prog = await first_circle.progress(db, user)

    number = user.get("first_circle_number")
    if number is None and prog["complete"]:
        number = await first_circle.try_admit(db, user)
        if number:
            await create_system_notification(
                db, user["_id"], "first_circle",
                preview=f"You're in the First Circle — member #{number} of {first_circle.CIRCLE_SIZE}.",
            )

    left = await first_circle.places_left(db)
    return FirstCircleState(
        steps=[FirstCircleStep(**s) for s in prog["steps"]],
        complete=prog["complete"],
        number=number,
        joined_at=user.get("first_circle_at"),
        premium_until=user.get("premium_grant_until"),
        places_left=left,
        circle_size=first_circle.CIRCLE_SIZE,
        # Closed for everyone still outside it. A member's own card never
        # says "closed" -- they're in, so it shows their number instead.
        closed=left <= 0 and number is None,
        show_celebration=bool(number) and not user.get("first_circle_celebrated"),
    )


@router.post("/first-circle/seen", status_code=status.HTTP_204_NO_CONTENT)
async def mark_first_circle_celebrated(user: dict = Depends(get_current_user)):
    """Dismiss the "you're in" card for good. Separate from awarding the
    place so the moment survives a reload -- someone who joins on a flaky
    connection, or closes the tab before it renders, still gets to see it."""
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"first_circle_celebrated": True}})


@router.post("/onboarding/dismiss", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_onboarding_checklist(user: dict = Depends(get_current_user)):
    """Hide the getting-started checklist for good, finished or not. It's a
    nudge, not a chore -- and it's the escape hatch for anyone whose steps
    can't be re-detected (someone who deleted the only post that proved
    they'd shared one)."""
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"onboarding_dismissed": True}})


@router.get("/story-inbox", response_model=list[StoryInboxItem])
async def my_story_inbox(user: dict = Depends(get_current_user)):
    """Stories other people have sent directly to you."""
    db = get_db()
    await _expire_ephemeral_stories(db)
    sends = await db.story_sends.find({"recipient_id": user["_id"]}, sort_key="created_at", reverse=True)
    items = []
    for send in sends:
        story = await db.ephemeral_stories.find_one({"_id": send["ephemeral_story_id"]})
        if not story:
            continue  # expired since it was sent
        items.append(StoryInboxItem(
            story=await _serialize_ephemeral_story(story, user, db),
            sender_id=send["sender_id"],
            sender_name=send.get("sender_name", "Someone"),
            sent_at=send["created_at"],
        ))
    return items


@router.get("/insights", response_model=Insights)
async def my_insights(user: dict = Depends(get_current_user)):
    """How your stories are performing. A Premium perk -- available to any
    Premium account, business or not."""
    if not has_premium({**user, "is_founder": is_founder(user)}):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insights are a Premium perk. Upgrade to Premium to unlock them.")
    db = get_db()
    my_stories = await db.stories.find({"author_id": user["_id"]})
    story_ids = {s["_id"] for s in my_stories}
    supports = sum(s.get("support_count", 0) for s in my_stories)
    replies = sum(s.get("comment_count", 0) for s in my_stories)
    reposts = len([r for r in await db.reposts.find({}) if r["story_id"] in story_ids])
    saves = len([s for s in await db.saves.find({}) if s["story_id"] in story_ids])
    followers = len(await db.follows.find({"following_id": user["_id"]}))
    return Insights(
        followers=followers,
        stories=len(my_stories),
        supports_received=supports,
        replies_received=replies,
        reposts_received=reposts,
        saves_received=saves,
    )


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
                story_title=story_display_name(story),
                created_at=r.get("created_at", 0),
            ))

    for c in await db.comments.find({"author_id": user["_id"]}):
        story = await db.stories.find_one({"_id": c["story_id"]})
        if story:
            items.append(ActivityItem(
                type="reply",
                detail=c["body"],
                story_id=story["_id"],
                story_title=story_display_name(story),
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


@router.get("/muted", response_model=list[ProfileUser])
async def my_muted(user: dict = Depends(get_current_user)):
    db = get_db()
    mutes = await db.mutes.find({"muter_id": user["_id"]})
    result = []
    for m in mutes:
        u = await db.users.find_one({"_id": m["muted_id"]})
        if u:
            result.append(_profile_user(u))
    return result


@router.get("/follow-requests", response_model=list[ProfileUser])
async def my_follow_requests(user: dict = Depends(get_current_user)):
    """People asking to follow you (private accounts only get these)."""
    db = get_db()
    requests = await db.follow_requests.find({"target_id": user["_id"]}, sort_key="created_at", reverse=True)
    result = []
    for r in requests:
        u = await db.users.find_one({"_id": r["requester_id"]})
        if u:
            result.append(_profile_user(u))
    return result


@router.post("/follow-requests/{requester_id}/accept", status_code=204)
async def accept_follow_request(requester_id: str, user: dict = Depends(get_current_user)):
    import time
    db = get_db()
    pending = await db.follow_requests.find_one({"requester_id": requester_id, "target_id": user["_id"]})
    if not pending:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such request.")
    await db.follow_requests.delete_one({"requester_id": requester_id, "target_id": user["_id"]})
    existing = await db.follows.find_one({"follower_id": requester_id, "following_id": user["_id"]})
    if not existing:
        requester = await db.users.find_one({"_id": requester_id})
        if requester:
            await notify_new_follower(user, requester)
        await db.follows.insert_one({
            "follower_id": requester_id,
            "following_id": user["_id"],
            "created_at": time.time(),
        })


@router.delete("/follow-requests/{requester_id}", status_code=204)
async def decline_follow_request(requester_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.follow_requests.delete_one({"requester_id": requester_id, "target_id": user["_id"]})


@router.get("/export")
async def export_my_data(user: dict = Depends(get_current_user)):
    """Download everything Inspire holds about you, as JSON."""
    db = get_db()
    uid = user["_id"]
    profile = {k: v for k, v in user.items() if k not in ("password_hash",)}
    return {
        "profile": profile,
        "stories": await db.stories.find({"author_id": uid}),
        "comments": await db.comments.find({"author_id": uid}),
        "reactions_given": await db.reactions.find({"user_id": uid}),
        "reposts": await db.reposts.find({"user_id": uid}),
        "saves": await db.saves.find({"user_id": uid}),
        "following": await db.follows.find({"follower_id": uid}),
        "followers": await db.follows.find({"following_id": uid}),
        "close_circle": await db.close_circle.find({"owner_id": uid}),
        "blocked": await db.blocks.find({"blocker_id": uid}),
        "muted": await db.mutes.find({"muter_id": uid}),
        "ephemeral_stories": await db.ephemeral_stories.find({"author_id": uid}),
    }


@router.delete("", status_code=204)
async def delete_my_account(user: dict = Depends(get_current_user)):
    """Permanently delete this account and everything it created."""
    await delete_account_cascade(get_db(), user["_id"])


async def delete_account_cascade(db, uid: str) -> None:
    """Permanently deletes an account and everything it created. Shared by
    the self-service delete above and the founder-only admin removal, so
    both leave the same clean state behind."""
    # Reactions/comments this user left on other people's stories: remove and
    # fix the counters so nothing overcounts.
    for r in await db.reactions.find({"user_id": uid}):
        await db.stories.update_one({"_id": r["story_id"]}, {"$inc": {"support_count": -1}})
    await db.reactions.delete_many({"user_id": uid})
    for c in await db.comments.find({"author_id": uid}):
        await db.stories.update_one({"_id": c["story_id"]}, {"$inc": {"comment_count": -1}})
    await db.comments.delete_many({"author_id": uid})

    # This user's own stories and everything attached to them.
    for s in await db.stories.find({"author_id": uid}):
        await db.comments.delete_many({"story_id": s["_id"]})
        await db.reactions.delete_many({"story_id": s["_id"]})
        await db.reposts.delete_many({"story_id": s["_id"]})
        await db.saves.delete_many({"story_id": s["_id"]})
    await db.stories.delete_many({"author_id": uid})
    await db.story_drafts.delete_many({"author_id": uid})

    # This user's own ephemeral Stories and everything attached to them.
    for es in await db.ephemeral_stories.find({"author_id": uid}):
        await db.story_likes.delete_many({"ephemeral_story_id": es["_id"]})
        await db.story_sends.delete_many({"ephemeral_story_id": es["_id"]})
    await db.ephemeral_stories.delete_many({"author_id": uid})

    # Relationships and settings state.
    await db.reposts.delete_many({"user_id": uid})
    await db.saves.delete_many({"user_id": uid})
    await db.follows.delete_many({"follower_id": uid})
    await db.follows.delete_many({"following_id": uid})
    await db.blocks.delete_many({"blocker_id": uid})
    await db.blocks.delete_many({"blocked_id": uid})
    await db.mutes.delete_many({"muter_id": uid})
    await db.mutes.delete_many({"muted_id": uid})
    await db.close_circle.delete_many({"owner_id": uid})
    await db.close_circle.delete_many({"member_id": uid})
    await db.follow_requests.delete_many({"requester_id": uid})
    await db.follow_requests.delete_many({"target_id": uid})
    await db.story_likes.delete_many({"user_id": uid})
    await db.story_sends.delete_many({"sender_id": uid})
    await db.story_sends.delete_many({"recipient_id": uid})
    await db.aria_usage.delete_many({"user_id": uid})

    # DM conversations this user was part of, and everything in them.
    for c in await db.conversations.find({}):
        if uid in (c["user_a"], c["user_b"]):
            await db.messages.delete_many({"conversation_id": c["_id"]})
            await db.conversations.delete_one({"_id": c["_id"]})

    await db.users.delete_one({"_id": uid})
