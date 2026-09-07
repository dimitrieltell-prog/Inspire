"""The First Circle -- a permanent badge for the first 100 people who
actually use Inspire, rather than the first 100 who sign up.

Five things earn a place: set up a profile, share 3 stories, follow 5
people, leave 5 comments, and come back on 3 different days. Finish them
and you're handed the next free number, 1 through 100, which is yours for
good. Once #100 is taken the circle closes permanently -- that's the part
that makes it worth anything.

Two rules shape the code more than anything else:

* Places go by who FINISHES, not who signed up. So a number can only be
  handed out by `try_admit`, and only once per person.

* Nobody may ever share a number with anyone else. That's why allocation
  goes through a single atomic counter document rather than counting the
  existing members and adding one -- two people finishing in the same
  second would both count 36 and both become #37.
"""

import time
from datetime import datetime, timezone

CIRCLE_SIZE = 100
COUNTER_ID = "first_circle"

# What it takes to get in.
STORIES_REQUIRED = 3
FOLLOWS_REQUIRED = 5
COMMENTS_REQUIRED = 5
DAYS_REQUIRED = 3

# A year of Premium, on the house.
GRANT_SECONDS = 365 * 24 * 3600

# How far apart two visits must be to count as different days. Deliberately
# NOT a calendar comparison: the server thinks in UTC, so someone in New
# York browsing at 8pm has already crossed midnight server-side and a
# single evening on the sofa would score two of the three days. Twenty
# hours means three days means three genuinely separate visits, wherever
# in the world someone is.
DAY_GAP_SECONDS = 20 * 3600


def has_premium(user: dict) -> bool:
    """Premium from any source: a paid Stripe subscription, being the
    founder, or an unexpired First Circle grant.

    The grant is deliberately its own field rather than flipping
    `is_premium`. Stripe sets that flag true on payment and false on
    cancellation, so a member who later subscribes and then cancels would
    have had their gift year switched off by the cancellation webhook.
    """
    if user.get("is_premium") or user.get("is_founder"):
        return True
    until = user.get("premium_grant_until")
    return bool(until and until > time.time())


def premium_source(user: dict) -> str:
    """Which of the above is currently paying for it -- so the UI can say
    'your First Circle year runs until March' instead of implying they're
    being billed."""
    if user.get("is_founder"):
        return "founder"
    if user.get("is_premium"):
        return "stripe"
    until = user.get("premium_grant_until")
    if until and until > time.time():
        return "first_circle"
    return "none"


async def _issued_count(db) -> int:
    counter = await db.counters.find_one({"_id": COUNTER_ID})
    return (counter or {}).get("issued", 0)


async def places_left(db) -> int:
    return max(0, CIRCLE_SIZE - await _issued_count(db))


async def record_active_day(db, user: dict) -> None:
    """Credit today, if it's far enough from the last day already credited.

    Called on every authenticated request, so it must be cheap and must not
    write on the overwhelming majority of them -- the gap check makes it
    write at most once per user per day.
    """
    if user.get("first_circle_number"):
        return  # already in; stop counting
    now = time.time()
    days = user.get("active_days") or []
    if days and now - max(days) < DAY_GAP_SECONDS:
        return
    days = sorted(days + [now])[-DAYS_REQUIRED:]
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"active_days": days}})
    user["active_days"] = days


async def backfill_active_days(db, user: dict) -> list:
    """Reconstruct someone's separate visits from things they've already
    done, so members who were here long before this shipped aren't sent
    back to zero on the one step that takes real time to finish.

    Every story, comment, follow and like is stamped with when it happened,
    so the history is already there -- it's just spread across collections
    and has never been read this way before.
    """
    uid = user["_id"]
    stamps = []
    for story in await db.stories.find({"author_id": uid}):
        stamps.append(story.get("created_at"))
    for comment in await db.comments.find({"author_id": uid}):
        stamps.append(comment.get("created_at"))
    for follow in await db.follows.find({"follower_id": uid}):
        stamps.append(follow.get("created_at"))
    for reaction in await db.reactions.find({"user_id": uid}):
        stamps.append(reaction.get("created_at"))

    # Same 20-hour rule as live tracking, applied oldest-first, so a
    # backfilled day and a live one mean exactly the same thing.
    days = []
    for t in sorted(s for s in stamps if s):
        if not days or t - days[-1] >= DAY_GAP_SECONDS:
            days.append(t)
    return days[-DAYS_REQUIRED:]


async def progress(db, user: dict) -> dict:
    """Where someone is on each of the five steps."""
    uid = user["_id"]

    # Anonymous posts count. Inspire only hides the name when displaying
    # one -- the person still wrote it, and it was still the work the step
    # is asking for.
    stories = len(await db.stories.find({"author_id": uid}))
    comments = len(await db.comments.find({"author_id": uid}))

    # Accepted follows only. Following a private account creates a request
    # instead, and that isn't a connection until the other person says so.
    follows = len(await db.follows.find({"follower_id": uid}))

    days = user.get("active_days")
    if days is None:
        # First time we've looked at this person since the feature shipped.
        days = await backfill_active_days(db, user)
        await db.users.update_one({"_id": uid}, {"$set": {"active_days": days}})
        user["active_days"] = days

    profile_done = bool(user.get("avatar_url") or user.get("bio"))

    steps = [
        {"key": "profile", "title": "Set up your profile",
         "subtitle": "A photo and a line about you.",
         "done": profile_done, "have": 1 if profile_done else 0, "need": 1,
         "cta_url": "/profile"},
        {"key": "stories", "title": f"Share {STORIES_REQUIRED} stories",
         "subtitle": "Enough to actually say something.",
         "done": stories >= STORIES_REQUIRED, "have": min(stories, STORIES_REQUIRED),
         "need": STORIES_REQUIRED, "cta_url": "/stories/new"},
        {"key": "follows", "title": f"Follow {FOLLOWS_REQUIRED} people",
         "subtitle": "A feed worth coming back to.",
         "done": follows >= FOLLOWS_REQUIRED, "have": min(follows, FOLLOWS_REQUIRED),
         "need": FOLLOWS_REQUIRED, "cta_url": "/stories"},
        {"key": "comments", "title": f"Leave {COMMENTS_REQUIRED} comments",
         "subtitle": "Show up for other people.",
         "done": comments >= COMMENTS_REQUIRED, "have": min(comments, COMMENTS_REQUIRED),
         "need": COMMENTS_REQUIRED, "cta_url": "/stories"},
        {"key": "days", "title": f"Come back on {DAYS_REQUIRED} different days",
         "subtitle": "No rush — that's the point.",
         "done": len(days) >= DAYS_REQUIRED, "have": min(len(days), DAYS_REQUIRED),
         "need": DAYS_REQUIRED, "cta_url": None},
    ]
    return {"steps": steps, "complete": all(s["done"] for s in steps)}


async def try_admit(db, user: dict) -> int | None:
    """Hand this person the next free number, or None if they can't have one.

    The counter is incremented first and the result inspected afterwards.
    That order is what makes it safe: `find_one_and_update` is a single
    atomic operation, so every caller walks away with a different number
    even when they arrive at the same instant. If the number that comes
    back is past the end of the circle then it was already full, nobody is
    admitted, and the counter having drifted a little past 100 is harmless
    -- it only ever allocates, it's never used as the membership count.
    """
    if user.get("first_circle_number"):
        return user["first_circle_number"]

    counter = await db.counters.find_one_and_update(
        {"_id": COUNTER_ID}, {"$inc": {"issued": 1}}, upsert=True
    )
    number = (counter or {}).get("issued", 0)
    if number < 1 or number > CIRCLE_SIZE:
        return None

    now = time.time()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "first_circle_number": number,
        "first_circle_at": now,
        "premium_grant_until": now + GRANT_SECONDS,
    }})
    user["first_circle_number"] = number
    user["first_circle_at"] = now
    user["premium_grant_until"] = now + GRANT_SECONDS
    return number
