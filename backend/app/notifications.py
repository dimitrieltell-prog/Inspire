"""
Notification email content + digest computation. Routers call into this
rather than building emails themselves, so the "someone followed you" email
sent from a public-account follow (users_router) and the one sent from an
accepted private-account follow request (me_router) always look the same.
"""
import logging
import time

from app.auth import create_unsubscribe_token
from app.config import settings
from app.email_client import send_email

logger = logging.getLogger("inspire.notifications")

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


def _welcome_email_html(display_name: str) -> str:
    """A personal note from the founder, not a product-notification card --
    plain letter styling on purpose, closer to how a real email from a
    person reads than a marketing template."""
    first_name = (display_name or "there").split(" ")[0]
    stories_url = f"{settings.frontend_url}/stories/new"
    profile_url = f"{settings.frontend_url}/profile"
    aria_url = f"{settings.frontend_url}/aria"
    return f"""\
<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:{FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <tr>
              <td style="font-family:{FONT_STACK};font-size:15px;line-height:1.7;color:{COLOR_NAVY};">
                <p style="margin:0 0 18px;">Hey {first_name},</p>
                <p style="margin:0 0 18px;">I'm Dimitri — I'm 18, and I'm the founder and CEO of Inspire. I built this myself, nights and weekends, because I wanted to create a space where sharing something real actually feels good — genuine, not performative.</p>
                <p style="margin:0 0 18px;">I wanted somewhere quieter, without the pressure of likes, followers, or a perfect feed getting in the way of just being honest about how you're doing.</p>
                <p style="margin:0 0 10px;">A few things worth trying first:</p>
                <ol style="margin:0 0 18px;padding-left:20px;">
                  <li style="margin-bottom:8px;"><a href="{stories_url}" style="color:{COLOR_INDIGO};font-weight:600;text-decoration:none;">Share your first story</a> — writing something real, even something small, is the best way to see what this is about.</li>
                  <li style="margin-bottom:8px;"><a href="{profile_url}" style="color:{COLOR_INDIGO};font-weight:600;text-decoration:none;">Set up your profile</a> — add a photo and a bit about yourself so people know it's you.</li>
                  <li style="margin-bottom:0;"><a href="{aria_url}" style="color:{COLOR_INDIGO};font-weight:600;text-decoration:none;">Say hi to Aria</a> — a reflective AI companion built into the app, there if you ever want to think something through.</li>
                </ol>
                <p style="margin:0 0 18px;">By the way, I'd genuinely love to know what's brought you to Inspire. Just hit reply — I read every one.</p>
                <p style="margin:0;">— Dimitri</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:36px;font-family:{FONT_STACK};font-size:12px;color:{COLOR_SLATE_LIGHT};">
                Inspire · inspirerealexperiences.com
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


async def send_welcome_email(db, user: dict) -> None:
    if user.get("email_notifications", True):
        html = _welcome_email_html(user.get("display_name", ""))
        send_email(
            user["email"], "Welcome to Inspire", html,
            reply_to="support@inspirerealexperiences.com",
            unsubscribe_url=_unsubscribe_url(user["_id"]),
        )
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"intro_email_sent": True}})


def _existing_user_intro_html(display_name: str) -> str:
    """Same personal-letter styling as the new-user welcome email, but for
    accounts that pre-date it -- a founder introduction they never got."""
    first_name = (display_name or "there").split(" ")[0]
    stories_url = f"{settings.frontend_url}/stories/new"
    profile_url = f"{settings.frontend_url}/profile"
    aria_url = f"{settings.frontend_url}/aria"
    return f"""\
<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:{FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <tr>
              <td style="font-family:{FONT_STACK};font-size:15px;line-height:1.7;color:{COLOR_NAVY};">
                <p style="margin:0 0 18px;">Hey {first_name},</p>
                <p style="margin:0 0 18px;">I'm Dimitri — I'm 18, and I'm the founder and CEO of Inspire. You've already been a part of the Inspire community, but with all my recent updates, I never actually introduced myself, so — hey.</p>
                <p style="margin:0 0 18px;">I built Inspire myself, nights and weekends, because I wanted a space where sharing something real actually feels good — genuine, not performative. No pressure of likes, followers, or a perfect feed getting in the way of just being honest about how you're doing.</p>
                <p style="margin:0 0 10px;">In case you haven't tried these yet:</p>
                <ol style="margin:0 0 18px;padding-left:20px;">
                  <li style="margin-bottom:8px;"><a href="{stories_url}" style="color:{COLOR_INDIGO};font-weight:600;text-decoration:none;">Share a story</a> — writing something real, even something small, is the best way to see what this is about.</li>
                  <li style="margin-bottom:8px;"><a href="{profile_url}" style="color:{COLOR_INDIGO};font-weight:600;text-decoration:none;">Set up your profile</a> — add a photo and a bit about yourself so people know it's you.</li>
                  <li style="margin-bottom:0;"><a href="{aria_url}" style="color:{COLOR_INDIGO};font-weight:600;text-decoration:none;">Say hi to Aria</a> — a reflective AI companion built into the app, there if you ever want to think something through.</li>
                </ol>
                <p style="margin:0 0 18px;">By the way, I'd genuinely love to know what's brought you to Inspire. Just hit reply — I read every one.</p>
                <p style="margin:0;">— Dimitri</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:36px;font-family:{FONT_STACK};font-size:12px;color:{COLOR_SLATE_LIGHT};">
                Inspire · inspirerealexperiences.com
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


async def send_existing_user_intro_email(db, user: dict) -> None:
    if user.get("email_notifications", True):
        html = _existing_user_intro_html(user.get("display_name", ""))
        send_email(
            user["email"], "Hey — introducing myself", html,
            reply_to="support@inspirerealexperiences.com",
            unsubscribe_url=_unsubscribe_url(user["_id"]),
        )
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"intro_email_sent": True}})


async def notify_new_follower(followed: dict, follower: dict) -> None:
    if not followed.get("email_notifications", True):
        return
    follower_name = follower.get("display_name", "Someone")
    body = (
        f'<p style="margin:0 0 14px;">Hi {followed.get("display_name", "")},</p>'
        f'<p style="margin:0;"><strong>{_display_label(follower)}</strong> started following you on Inspire.</p>'
    )
    unsub_url = _unsubscribe_url(followed["_id"])
    html = _email_shell(
        preheader=f"{follower_name} started following you on Inspire",
        body_html=body,
        cta_text="View their profile",
        cta_url=f"{settings.frontend_url}/users/{follower['_id']}",
        unsubscribe_url=unsub_url,
    )
    try:
        send_email(
            followed["email"], f"{follower_name} started following you on Inspire", html,
            unsubscribe_url=unsub_url,
        )
    except Exception:
        logger.exception("Failed to send follow notification to %s", followed.get("email"))


async def notify_new_message(recipient: dict, sender: dict) -> None:
    """Sent once, when someone starts a new conversation -- not per message,
    so an active back-and-forth doesn't spam an inbox."""
    if not recipient.get("email_notifications", True):
        return
    sender_name = sender.get("display_name", "Someone")
    body = (
        f'<p style="margin:0 0 14px;">Hi {recipient.get("display_name", "")},</p>'
        f'<p style="margin:0;"><strong>{_display_label(sender)}</strong> sent you a message on Inspire.</p>'
    )
    unsub_url = _unsubscribe_url(recipient["_id"])
    html = _email_shell(
        preheader=f"{sender_name} sent you a message on Inspire",
        body_html=body,
        cta_text="Open the conversation",
        cta_url=f"{settings.frontend_url}/messages/{sender['_id']}",
        unsubscribe_url=unsub_url,
    )
    try:
        send_email(
            recipient["email"], f"{sender_name} sent you a message on Inspire", html,
            unsubscribe_url=unsub_url,
        )
    except Exception:
        logger.exception("Failed to send message notification to %s", recipient.get("email"))


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
                unsub_url = _unsubscribe_url(uid)
                html = _email_shell(
                    preheader=f"You got {summary} on Inspire",
                    body_html=body,
                    cta_text="Open Inspire",
                    cta_url=f"{settings.frontend_url}/profile",
                    unsubscribe_url=unsub_url,
                )
                try:
                    send_email(
                        u["email"], f"You got {summary} on Inspire", html,
                        unsubscribe_url=unsub_url,
                    )
                    sent += 1
                except Exception:
                    logger.exception("Failed to send digest email to %s", u.get("email"))

        await db.users.update_one({"_id": uid}, {"$set": {"last_digest_sent_at": now}})

    return {"checked": len(users), "sent": sent}
