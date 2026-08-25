from typing import Optional

from fastapi import APIRouter, Depends

from app.auth import get_optional_user
from app.database import get_db
from app.models import SearchResults
from app.routers.stories_router import _can_view_story, _contains_muted_word, _hidden_author_ids, serialize_story
from app.routers.users_router import _profile_user

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResults)
async def search(q: str = "", viewer: Optional[dict] = Depends(get_optional_user)):
    """Global search: matches people by name/username and posts by body,
    category, or tags."""
    q = q.strip().lower()
    if len(q) < 2:
        return SearchResults(users=[], stories=[])

    db = get_db()

    # People
    all_users = await db.users.find({})
    user_matches = [
        u for u in all_users
        if q in u.get("display_name", "").lower() or q in (u.get("username") or "").lower()
    ]
    if viewer:
        blocked_by = {b["blocker_id"] for b in await db.blocks.find({"blocked_id": viewer["_id"]})}
        user_matches = [u for u in user_matches if u["_id"] not in blocked_by]
    user_results = [_profile_user(u) for u in user_matches[:8]]

    # Posts
    stories = await db.stories.find({}, sort_key="created_at", reverse=True)
    hidden = await _hidden_author_ids(db, viewer)
    if hidden:
        stories = [s for s in stories if s.get("author_id") not in hidden]
    muted_words = (viewer or {}).get("muted_words", [])
    if muted_words:
        stories = [s for s in stories if not _contains_muted_word((s.get("title") or "") + " " + (s.get("body") or ""), muted_words)]

    def matches(s: dict) -> bool:
        # Titles aren't shown anywhere any more, so they're not searched
        # either -- matching one would return a post with no visible reason
        # for being a hit. The muted-word filter above still checks the
        # stored title, since erring toward hiding is the safe direction.
        haystack = " ".join([
            s.get("body") or "", s.get("category") or "", " ".join(s.get("tags") or []),
        ]).lower()
        return q in haystack

    # Visibility is enforced here as well as in the feed. Search previously
    # applied only the block/mute and muted-word filters and never called
    # _can_view_story, so an unauthenticated caller searching a common word
    # could read posts belonging to private accounts they don't follow.
    # Filter BEFORE the [:10] slice, or a hidden post still consumes one of
    # the ten result slots and silently buries a legitimate match.
    visible = [s for s in stories if matches(s) and await _can_view_story(db, s, viewer)]
    story_matches = visible[:10]
    story_results = [await serialize_story(s, viewer, db) for s in story_matches]

    return SearchResults(users=user_results, stories=story_results)
