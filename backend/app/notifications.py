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

FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif"
COLOR_NAVY = "#131A33"
COLOR_INDIGO = "#3B4A8C"
COLOR_SLATE = "#5B6478"
COLOR_SLATE_LIGHT = "#8890A0"
COLOR_LINE = "#E4E8F0"
COLOR_BG = "#F3F6FA"


def _email_shell(preheader: str, body_html: str, cta_text: str, cta_url: str, unsubscribe_url: str) -> str:
    """Shared layout for every notification email -- table-based and
    inline-styled so it renders consistently across email clients."""
    return f"""\
<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;padding:0;background:{COLOR_BG};font-family:{FONT_STACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{COLOR_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid {COLOR_LINE};">
            <tr>
              <td style="padding:28px 32px 20px;border-bottom:1px solid {COLOR_LINE};">
                <span style="font-family:{FONT_STACK};font-size:20px;font-weight:700;color:{COLOR_NAVY};">Inspire</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:{FONT_STACK};font-size:15px;line-height:1.6;color:{COLOR_NAVY};">
                {body_html}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:999px;background:{COLOR_INDIGO};">
                      <a href="{cta_url}" style="display:inline-block;padding:12px 24px;font-family:{FONT_STACK};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">{cta_text}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid {COLOR_LINE};">
                <p style="margin:0 0 6px;font-family:{FONT_STACK};font-size:12px;color:{COLOR_SLATE_LIGHT};">Inspire · inspirerealexperiences.com</p>
                <p style="margin:0;font-family:{FONT_STACK};font-size:12px;color:{COLOR_SLATE_LIGHT};">
                  <a href="{unsubscribe_url}" style="color:{COLOR_SLATE};">Unsubscribe from these emails</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _display_label(user: dict) -> str:
    """How we name someone when specifying who triggered a notification --
    e.g. "Jamie Rivera (@jamierivera)"."""
    name = user.get("display_name", "Someone")
    username = user.get("username")
    return f"{name} (@{username})" if username else name


def _unsubscribe_url(user_id: str) -> str:
    token = create_unsubscribe_token(user_id)
    return f"{settings.backend_url}/notifications/unsubscribe?token={token}"


async def notify_new_follower(followed: dict, follower: dict) -> None:
    if not followed.get("email_notifications", True):
        return
    follower_name = follower.get("display_name", "Someone")
    body = (
        f'<p style="margin:0 0 14px;">Hi {followed.get("display_name", "")},</p>'
        f'<p style="margin:0;"><strong>{_display_label(follower)}</strong> started following you on Inspire.</p>'
    )
    html = _email_shell(
        preheader=f"{follower_name} started following you on Inspire",
        body_html=body,
        cta_text="View their profile",
        cta_url=f"{settings.frontend_url}/users/{follower['_id']}",
        unsubscribe_url=_unsubscribe_url(followed["_id"]),
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
                body = (
                    f'<p style="margin:0 0 14px;">Hi {u.get("display_name", "")},</p>'
                    f'<p style="margin:0;">You got {summary} on your Inspire posts.</p>'
                )
                html = _email_shell(
                    preheader=f"You got {summary} on Inspire",
                    body_html=body,
                    cta_text="Open Inspire",
                    cta_url=f"{settings.frontend_url}/profile",
                    unsubscribe_url=_unsubscribe_url(uid),
                )
                send_email(u["email"], f"You got {summary} on Inspire", html)
                sent += 1

        await db.users.update_one({"_id": uid}, {"$set": {"last_digest_sent_at": now}})

    return {"checked": len(users), "sent": sent}
