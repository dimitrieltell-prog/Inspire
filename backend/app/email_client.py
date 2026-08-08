"""
Sends transactional/notification emails via Resend. If RESEND_API_KEY isn't
set, calls are logged instead of sent so the app still runs with zero
external keys.

Swap to production: set RESEND_API_KEY (and optionally EMAIL_FROM once a
sending domain is verified) in .env. No other code needs to change --
routers only ever call `send_email()`.
"""
import logging

from app.config import settings

logger = logging.getLogger("inspire.email")


def send_email(
    to: str,
    subject: str,
    html: str,
    reply_to: str | None = None,
    unsubscribe_url: str | None = None,
) -> None:
    if not settings.resend_api_key:
        logger.info("[email disabled] Would send to %s: %s", to, subject)
        return

    import resend

    resend.api_key = settings.resend_api_key
    payload = {
        "from": settings.email_from,
        "to": to,
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    if unsubscribe_url:
        # Invisible to the reader, but its presence is one of the signals
        # spam filters use to judge anything that looks like a batch send --
        # worth having even though our unsubscribe page is a plain link, not
        # a one-click POST endpoint (so no List-Unsubscribe-Post header).
        payload["headers"] = {"List-Unsubscribe": f"<{unsubscribe_url}>"}
    resend.Emails.send(payload)
