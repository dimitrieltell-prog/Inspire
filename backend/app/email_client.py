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


def send_email(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        logger.info("[email disabled] Would send to %s: %s", to, subject)
        return

    import resend

    resend.api_key = settings.resend_api_key
    resend.Emails.send({
        "from": settings.email_from,
        "to": to,
        "subject": subject,
        "html": html,
    })
