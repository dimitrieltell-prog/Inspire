import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, get_optional_user, is_founder
from app.database import get_db
from app.inapp_notifications import create_notification
from app.models import REACTIONS, CommentCreate, CommentOut, ReactionCreate, ReactorOut, StoryCreate, StoryOut
from app.moderation import contains_hostility

router = APIRouter(prefix="/stories", tags=["stories"])


async def serialize_story(story: dict, viewer, db) -> StoryOut:
    reposts = await db.reposts.find({"story_id": story["_id"]})
    is_saved = False
    is_reposted = False
    my_reaction = None
    if viewer:
        is_saved = bool(await db.saves.find_one({"user_id": viewer["_id"], "story_id": story["_id"]}))
        is_reposted = any(r["user_id"] == viewer["_id"] for r in reposts)
        own_reaction = await db.reactions.find_one({"story_id": story["_id"], "user_id": viewer["_id"]})
        my_reaction = own_reaction["reaction"] if own_reaction else None

    author = await db.users.find_one({"_id": story.get("author_id")}) if story.get("author_id") else None
    is_author = bool(viewer and story.get("author_id") == viewer["_id"])
    counts_hidden = bool(author and author.get("hide_support_counts") and not is_author)
    # Business visibility perk: category chip on non-anonymous posts.
    author_is_business = bool(author and author.get("is_business") and not story["is_anonymous"])

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
        support_count=0 if counts_hidden else story.get("support_count", 0),
        comment_count=story.get("comment_count", 0),
        repost_count=len(reposts),
        is_saved=is_saved,
        is_reposted=is_reposted,
        my_reaction=my_reaction,
        counts_hidden=counts_hidden,
        author_is_business=author_is_business,
        author_business_category=author.get("business_category") if author_is_business else None,
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
    """Authors whose content the viewer shouldn't see: people they blocked,
    people who blocked them, and people they muted."""
    if not viewer:
        return set()
    hidden = set()
    for b in await db.blocks.find({"blocker_id": viewer["_id"]}):
        hidden.add(b["blocked_id"])
    for b in await db.blocks.find({"blocked_id": viewer["_id"]}):
        hidden.add(b["blocker_id"])
    for m in await db.mutes.find({"muter_id": viewer["_id"]}):
        hidden.add(m["muted_id"])
    return hidden


def _contains_muted_word(text: str, muted_words: list) -> bool:
    lowered = text.lower()
    return any(w in lowered for w in muted_words)


async def _can_view_story(db, story: dict, viewer: Optional[dict]) -> bool:
    """A story/post is visible to everyone unless its author has a private
    account, in which case only the author, the founder, and people who
    already follow the author can see it -- a shared link can't bypass that."""
    author_id = story.get("author_id")
    if not author_id:
        return True
    if viewer and (viewer["_id"] == author_id or is_founder(viewer)):
        return True
    author = await db.users.find_one({"_id": author_id})
    if author and author.get("is_private", False):
        if not viewer:
            return False
        return bool(await db.follows.find_one({"follower_id": viewer["_id"], "following_id": author_id}))
    return True


async def _require_visible_story(db, story_id: str, viewer: Optional[dict]) -> dict:
    story = await db.stories.find_one({"_id": story_id})
    if not story or not await _can_view_story(db, story, viewer):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")
    return story


@router.get("", response_model=list[StoryOut])
async def list_stories(category: Optional[str] = None, tag: Optional[str] = None, limit: int = 30, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    query = {"category": category} if category and category != "all" else {}
    stories = await db.stories.find(query, sort_key="created_at", reverse=True)
    if tag:
        norm_tag = tag.strip().lstrip("#").lower()
        stories = [s for s in stories if norm_tag in [t.lower() for t in s.get("tags", [])]]
    hidden = await _hidden_author_ids(db, viewer)
    if hidden:
        stories = [s for s in stories if s.get("author_id") not in hidden]
    muted_words = (viewer or {}).get("muted_words", [])
    if muted_words:
        stories = [s for s in stories if not _contains_muted_word(s["title"] + " " + s["body"], muted_words)]
    stories = [s for s in stories if await _can_view_story(db, s, viewer)]
    return [await serialize_story(s, viewer, db) for s in stories[:limit]]


@router.get("/{story_id}", response_model=StoryOut)
async def get_story(story_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    story = await _require_visible_story(db, story_id, viewer)
    return await serialize_story(story, viewer, db)


@router.get("/{story_id}/comments", response_model=list[CommentOut])
async def list_comments(story_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    await _require_visible_story(db, story_id, viewer)
    comments = await db.comments.find({"story_id": story_id}, sort_key="created_at", reverse=False)
    hidden = await _hidden_author_ids(db, viewer)
    if hidden:
        comments = [c for c in comments if c.get("author_id") not in hidden]
    muted_words = (viewer or {}).get("muted_words", [])
    if muted_words:
        comments = [c for c in comments if not _contains_muted_word(c["body"], muted_words)]
    return [_to_comment_out(c) for c in comments]


@router.post("/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(payload: CommentCreate, user: dict = Depends(get_current_user)):
    if contains_hostility(payload.body):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Let's keep this space respectful — please remove any hurtful language and try again.",
        )

    db = get_db()
    story = await _require_visible_story(db, payload.story_id, user)

    author_id = story.get("author_id")
    if author_id and author_id != user["_id"]:
        # Blocks (either direction) prevent replying.
        if await db.blocks.find_one({"blocker_id": author_id, "blocked_id": user["_id"]}) or \
           await db.blocks.find_one({"blocker_id": user["_id"], "blocked_id": author_id}):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found.")

        # Respect the author's reply-audience setting.
        author = await db.users.find_one({"_id": author_id})
        audience = (author or {}).get("comment_audience", "everyone")
        if audience == "no_one":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "The author turned off replies on their stories.")
        if audience == "followers":
            if not await db.follows.find_one({"follower_id": user["_id"], "following_id": author_id}):
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Only people who follow the author can reply.")

    comment = await db.comments.insert_one({
        "story_id": payload.story_id,
        "author_id": user["_id"],
        "author_display_name": user["display_name"],
        "body": payload.body,
        "created_at": time.time(),
    })
    await db.stories.update_one({"_id": payload.story_id}, {"$inc": {"comment_count": 1}})
    await create_notification(db, author_id, user, "comment", target_id=payload.story_id, preview=payload.body[:80])
    return _to_comment_out(comment)


@router.post("/react", status_code=status.HTTP_204_NO_CONTENT)
async def react_to_story(payload: ReactionCreate, user: dict = Depends(get_current_user)):
    if payload.reaction not in REACTIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Reaction must be one of: {', '.join(REACTIONS)}")

    db = get_db()
    story = await _require_visible_story(db, payload.story_id, user)

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
        await create_notification(db, story.get("author_id"), user, "like", target_id=payload.story_id, preview=story.get("title"))


@router.delete("/{story_id}/react", status_code=status.HTTP_204_NO_CONTENT)
async def unreact_from_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    existing = await db.reactions.find_one({"story_id": story_id, "user_id": user["_id"]})
    if existing:
        await db.reactions.delete_one({"story_id": story_id, "user_id": user["_id"]})
        await db.stories.update_one({"_id": story_id}, {"$inc": {"support_count": -1}})


@router.get("/{story_id}/reactions", response_model=list[ReactorOut])
async def list_reactors(story_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    story = await _require_visible_story(db, story_id, viewer)
    author = await db.users.find_one({"_id": story.get("author_id")}) if story.get("author_id") else None
    is_author_or_founder = bool(viewer and (viewer["_id"] == story.get("author_id") or is_founder(viewer)))
    if author and author.get("hide_support_counts") and not is_author_or_founder:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account hides its support counts.")
    reactions = await db.reactions.find({"story_id": story_id}, sort_key="created_at", reverse=True)
    result = []
    for r in reactions:
        u = await db.users.find_one({"_id": r["user_id"]})
        if u:
            result.append(ReactorOut(display_name=u["display_name"], username=u.get("username"), reaction=r["reaction"]))
    return result


@router.post("/{story_id}/repost", status_code=status.HTTP_204_NO_CONTENT)
async def repost_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    story = await _require_visible_story(db, story_id, user)
    existing = await db.reposts.find_one({"story_id": story_id, "user_id": user["_id"]})
    if not existing:
        await db.reposts.insert_one({"story_id": story_id, "user_id": user["_id"], "created_at": time.time()})
        await create_notification(db, story.get("author_id"), user, "repost", target_id=story_id, preview=story.get("title"))


@router.delete("/{story_id}/repost", status_code=status.HTTP_204_NO_CONTENT)
async def unrepost_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.reposts.delete_one({"story_id": story_id, "user_id": user["_id"]})


@router.post("/{story_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def save_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await _require_visible_story(db, story_id, user)
    existing = await db.saves.find_one({"story_id": story_id, "user_id": user["_id"]})
    if not existing:
        await db.saves.insert_one({"story_id": story_id, "user_id": user["_id"], "created_at": time.time()})


@router.delete("/{story_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_story(story_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.saves.delete_one({"story_id": story_id, "user_id": user["_id"]})
