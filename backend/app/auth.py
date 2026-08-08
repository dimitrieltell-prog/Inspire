import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings
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
    """A no-login-required, one-purpose token for email unsubscribe links --
    doesn't expire like a session token, but can't be used to do anything
    other than unsubscribe (checked via the "purpose" claim)."""
    payload = {"sub": user_id, "purpose": "unsubscribe"}
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
    return user


async def get_optional_user(token: Optional[str] = Depends(optional_oauth2_scheme)) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
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
