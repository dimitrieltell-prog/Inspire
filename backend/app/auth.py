import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings
from app.first_circle import record_active_day
from app.database import get_db

# How long someone can go without a request before we consider their
# session over (used to measure how long their most recent session lasted).
SESSION_GAP_SECONDS = 30 * 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
# Same, but doesn't 401 when no token is present -- for endpoints that work
# logged-out but personalize when logged in.
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_unsubscribe_token(user_id: str) -> str:
    """A no-login-required, one-purpose token for email unsubscribe links.

    The "purpose" claim is what keeps this from being a password: it's
    signed with the same secret as a session token, so get_current_user
    rejects anything carrying a purpose. Long-lived because it has to keep
    working in an email someone opens months later, but no longer eternal.
    """
    expire = datetime.now(timezone.utc) + timedelta(days=365)
    payload = {"sub": user_id, "purpose": "unsubscribe", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_unsubscribe_token(token: str) -> Optional[str]:
    """Returns the user id if the token is a valid unsubscribe token, else None."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("purpose") != "unsubscribe":
        return None
    return payload.get("sub")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_error
        # Only session tokens can authenticate. Single-purpose tokens are
        # signed with the same secret, so without this check an unsubscribe
        # link -- which sits in the footer of every email we've ever sent,
        # and never expires -- works as a permanent password for that
        # account: read their profile, post as them, anything.
        if payload.get("purpose") is not None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise credentials_error

    now = time.time()
    prev_last_active = user.get("last_active") or 0
    updates = {}

    if not user.get("current_session_start") or (prev_last_active and now - prev_last_active > SESSION_GAP_SECONDS):
        # Either their very first request ever, or they went quiet long
        # enough that this counts as the start of a new session. Their
        # previous session's end is just their last recorded `last_active`,
        # so nothing needs to be stored for it separately.
        updates["current_session_start"] = now

    # Throttle to once a minute per user so the "active" signal doesn't turn
    # every request on every page into a write.
    if now - prev_last_active > 60:
        updates["last_active"] = now

    if updates:
        await db.users.update_one({"_id": user_id}, {"$set": updates})
        user.update(updates)

    # "Come back on 3 different days" for the First Circle. This is the one
    # step that can't be earned in a single sitting, so it has to be
    # noticed here, on any authenticated request, rather than at some
    # particular action. It writes at most once per person per day.
    await record_active_day(db, user)
    return user


async def get_optional_user(token: Optional[str] = Depends(optional_oauth2_scheme)) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        # Same rule as get_current_user: only session tokens identify a
        # viewer. Missing it here mattered as much as there -- this guards
        # the read endpoints (feed, search, profiles), and viewer identity
        # is exactly what decides which private posts get served.
        if payload.get("purpose") is not None:
            return None
    except JWTError:
        return None
    if not user_id:
        return None
    db = get_db()
    return await db.users.find_one({"_id": user_id})


def is_founder(user: dict) -> bool:
    return user.get("is_founder", False) or user["email"].lower() in settings.founder_emails


async def require_founder(user: dict = Depends(get_current_user)) -> dict:
    # 404 rather than 403 so the endpoint's existence isn't revealed to non-founders.
    if not is_founder(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    return user
