"""
Notification email content + digest computation. Routers call into this
rather than building emails themselves, so the "someone followed you" email
sent from a public-account follow (users_router) and the one sent from an
accepted private-account follow request (me_router) always look the same.
"""
import time

from app.auth import create_unsubscribe_token
from app.config import settings
from app.email_client import send_email


def _unsubscribe_footer(user_id: str) -> str:
    token = create_unsubscribe_token(user_id)
    url = f"{settings.backend_url}/notifications/unsubscribe?token={token}"
    return f'<p style="font-size:12px;color:#888;margin-top:24px;">Don\'t want these emails? <a href="{url}">Unsubscribe</a>.</p>'


async def notify_new_follower(followed: dict, follower: dict) -> None:
    if not followed.get("email_notifications", True):
        return
    follower_name = follower.get("display_name", "Someone")
    html = (
        f"<p>Hi {followed.get('display_name', '')},</p>"
        f"<p><strong>{follower_name}</strong> started following you on Inspire.</p>"
        f"{_unsubscribe_footer(followed['_id'])}"
    )
    send_email(followed["email"], f"{follower_name} started following you on Inspire", html)


async def run_digest_emails(db) -> dict:
    """Bundles likes + reposts since each user's last digest into one email.
    Called on a daily schedule, not per-action, so an active post doesn't
    spam someone's inbox."""
    users = await db.users.find({})
    stories = await db.stories.find({})
    reactions = await db.reactions.find({})
    reposts = await db.reposts.find({})
    story_author = {s["_id"]: s.get("author_id") for s in stories}

    now = time.time()
    sent = 0
    for u in users:
        uid = u["_id"]
        last_sent = u.get("last_digest_sent_at") or u.get("created_at") or now

        if u.get("email_notifications", True):
            like_count = sum(
                1 for r in reactions
                if story_author.get(r.get("story_id")) == uid and r.get("created_at", 0) > last_sent
            )
            repost_count = sum(
                1 for r in reposts
                if story_author.get(r.get("story_id")) == uid and r.get("created_at", 0) > last_sent
            )
            if like_count or repost_count:
                parts = []
                if like_count:
                    parts.append(f"{like_count} like{'s' if like_count != 1 else ''}")
                if repost_count:
                    parts.append(f"{repost_count} repost{'s' if repost_count != 1 else ''}")
                summary = " and ".join(parts)
                html = (
                    f"<p>Hi {u.get('display_name', '')},</p>"
                    f"<p>You got {summary} on your Inspire posts.</p>"
                    f"{_unsubscribe_footer(uid)}"
                )
                send_email(u["email"], f"You got {summary} on Inspire", html)
                sent += 1

        await db.users.update_one({"_id": uid}, {"$set": {"last_digest_sent_at": now}})

    return {"checked": len(users), "sent": sent}
