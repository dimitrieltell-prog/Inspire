from typing import Optional

from fastapi import APIRouter, Depends

from app.auth import get_optional_user
from app.database import get_db
from app.models import SearchResults
from app.routers.stories_router import _contains_muted_word, _hidden_author_ids, serialize_story
from app.routers.users_router import _profile_user

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResults)
async def search(q: str = "", viewer: Optional[dict] = Depends(get_optional_user)):
    """Global search: matches people by name/username and posts by title,
    body, category, or tags."""
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
        stories = [s for s in stories if not _contains_muted_word(s["title"] + " " + s["body"], muted_words)]

    def matches(s: dict) -> bool:
        haystack = " ".join([
            s.get("title", ""), s.get("body", ""), s.get("category", ""), " ".join(s.get("tags", [])),
        ]).lower()
        return q in haystack

    story_matches = [s for s in stories if matches(s)][:10]
    story_results = [await serialize_story(s, viewer, db) for s in story_matches]

    return SearchResults(users=user_results, stories=story_results)
