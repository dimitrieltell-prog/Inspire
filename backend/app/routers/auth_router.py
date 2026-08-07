import logging
import re
import time
from datetime import date

from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.auth import create_access_token, get_current_user, hash_password, is_founder, verify_password
from app.config import settings
from app.database import get_db
from app.models import (
    BUSINESS_CATEGORIES,
    COMMENT_AUDIENCES,
    GoogleAuthIn,
    GoogleSignupFinish,
    ProfileUpdate,
    TokenOut,
    UserLogin,
    UserOut,
    UserRegister,
)
from app.moderation import contains_hostility
from app.notifications import send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("inspire.auth")

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,30}$")

MINIMUM_AGE = 13


def _validate_birthdate(dob_str: str) -> str:
    """Parses a YYYY-MM-DD birthdate, enforces the minimum age, and returns it
    unchanged for storage. Raises a 400 on a bad format or an under-age date."""
    try:
        year, month, day = (int(p) for p in dob_str.split("-"))
        dob = date(year, month, day)
    except (ValueError, TypeError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please enter a valid date of birth.")

    if dob > date.today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That date of birth is in the future.")

    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < MINIMUM_AGE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"You must be at least {MINIMUM_AGE} years old to join Inspire.",
        )
    return dob_str


def _require_terms_accepted(accepted: bool) -> None:
    if not accepted:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "You must agree to the Terms of Service and Privacy Policy to continue.",
        )


def _slugify_username(base: str) -> str:
    slug = re.sub(r"[^a-z0-9_]", "", base.lower())
    return slug[:20] or "user"


async def _generate_username(db, base: str) -> str:
    candidate = _slugify_username(base)
    if len(candidate) < 3:
        candidate = f"{candidate}user"
    root = candidate
    n = 1
    while await db.users.find_one({"username": candidate}):
        n += 1
        candidate = f"{root}{n}"
    return candidate


def _validate_username_format(uname: str) -> None:
    if not USERNAME_RE.match(uname):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Username must be 3–30 characters: letters, numbers, or underscores.")
    if contains_hostility(uname):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a username without offensive language.")


async def ensure_username(db, user: dict) -> dict:
    """Existing accounts predate usernames -- lazily assign one when needed."""
    if not user.get("username"):
        username = await _generate_username(db, user["email"].split("@")[0])
        user = await db.users.update_one({"_id": user["_id"]}, {"$set": {"username": username}})
    return user


def _to_user_out(user: dict) -> UserOut:
    is_founder = user.get("is_founder", False) or user["email"].lower() in settings.founder_emails
    # Founders always get premium for free.
    is_premium = user.get("is_premium", False) or is_founder
    return UserOut(
        id=user["_id"],
        email=user["email"],
        display_name=user["display_name"],
        username=user.get("username"),
        username_confirmed=user.get("username_confirmed", False),
        avatar_url=user.get("avatar_url"),
        is_premium=is_premium,
        is_founder=is_founder,
        is_private=user.get("is_private", False),
        is_business=user.get("is_business", False),
        business_category=user.get("business_category"),
        contact_email=user.get("contact_email"),
        contact_website=user.get("contact_website"),
        comment_audience=user.get("comment_audience", "everyone"),
        hide_support_counts=user.get("hide_support_counts", False),
        muted_words=user.get("muted_words", []),
        email_notifications=user.get("email_notifications", True),
    )


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    db = get_db()
    user = await ensure_username(db, user)
    return _to_user_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    updates = {}

    if payload.display_name is not None:
        name = payload.display_name.strip()
        if not name:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Display name can't be empty.")
        if contains_hostility(name):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a display name without offensive language.")
        updates["display_name"] = name

    if payload.username is not None:
        uname = payload.username.strip().lower()
        _validate_username_format(uname)
        taken = await db.users.find_one({"username": uname})
        if taken and taken["_id"] != user["_id"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That username is already taken.")
        updates["username"] = uname
        updates["username_confirmed"] = True

    if payload.avatar_url is not None:
        url = payload.avatar_url.strip()
        if url and not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Avatar URL must start with http:// or https://")
        updates["avatar_url"] = url or None

    if payload.bio is not None:
        bio = payload.bio.strip()
        if contains_hostility(bio):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please remove offensive language from your bio.")
        updates["bio"] = bio

    if payload.pronouns is not None:
        pronouns = payload.pronouns.strip()
        if contains_hostility(pronouns):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose valid pronouns.")
        updates["pronouns"] = pronouns

    if payload.links is not None:
        links = [l.strip() for l in payload.links if l.strip()]
        if len(links) > 5:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can add up to 5 links.")
        for l in links:
            if len(l) > 200:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "That link is too long.")
            if not (l.startswith("http://") or l.startswith("https://")):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Links must start with http:// or https://")
        updates["links"] = links

    if payload.is_private is not None:
        updates["is_private"] = payload.is_private

    if payload.is_business is not None:
        updates["is_business"] = payload.is_business

    if payload.business_category is not None:
        cat = payload.business_category.strip()
        if cat and cat not in BUSINESS_CATEGORIES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Category must be one of: {', '.join(BUSINESS_CATEGORIES)}")
        updates["business_category"] = cat or None

    if payload.contact_email is not None:
        email = payload.contact_email.strip()
        if email and ("@" not in email or "." not in email.split("@")[-1]):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That doesn't look like a valid contact email.")
        updates["contact_email"] = email or None

    if payload.contact_website is not None:
        site = payload.contact_website.strip()
        if site and not (site.startswith("http://") or site.startswith("https://")):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Website must start with http:// or https://")
        updates["contact_website"] = site or None

    if payload.comment_audience is not None:
        if payload.comment_audience not in COMMENT_AUDIENCES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reply audience.")
        updates["comment_audience"] = payload.comment_audience

    if payload.hide_support_counts is not None:
        updates["hide_support_counts"] = payload.hide_support_counts

    if payload.email_notifications is not None:
        updates["email_notifications"] = payload.email_notifications

    if payload.muted_words is not None:
        words = [w.strip().lower() for w in payload.muted_words if w.strip()]
        is_premium = user.get("is_premium", False) or is_founder(user)
        max_words = 100 if is_premium else 25
        if len(words) > max_words:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"You can mute up to {max_words} words{'' if is_premium else ' — Premium allows up to 100'}.")
        for w in words:
            if len(w) > 40:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Muted words must be under 40 characters.")
        updates["muted_words"] = words

    if payload.schools is not None:
        schools = [s.strip() for s in payload.schools if s.strip()]
        if len(schools) > 5:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can add up to 5 schools.")
        for s in schools:
            if len(s) > 80:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "That school name is too long.")
            if contains_hostility(s):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please remove offensive language.")
        updates["schools"] = schools

    if updates:
        user = await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        if "display_name" in updates:
            await _sync_author_name(db, user["_id"], updates["display_name"])
    user = await ensure_username(db, user)
    return _to_user_out(user)


async def _sync_author_name(db, user_id: str, name: str):
    for story in await db.stories.find({"author_id": user_id}):
        await db.stories.update_one({"_id": story["_id"]}, {"$set": {"author_display_name": name}})
    for comment in await db.comments.find({"author_id": user_id}):
        await db.comments.update_one({"_id": comment["_id"]}, {"$set": {"author_display_name": name}})


@router.get("/username-available")
async def username_available(username: str = ""):
    """Live check while someone's typing a username, at signup or in Settings."""
    uname = username.strip().lower()
    if not USERNAME_RE.match(uname):
        return {"available": False, "reason": "Username must be 3–30 characters: letters, numbers, or underscores."}
    if contains_hostility(uname):
        return {"available": False, "reason": "Please choose a username without offensive language."}
    db = get_db()
    taken = await db.users.find_one({"username": uname})
    if taken:
        return {"available": False, "reason": "That username is already taken."}
    return {"available": True, "reason": None}


@router.post("/register", response_model=TokenOut)
async def register(payload: UserRegister):
    if contains_hostility(payload.display_name):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a display name without offensive language.")

    _require_terms_accepted(payload.accepted_terms)
    date_of_birth = _validate_birthdate(payload.date_of_birth)

    db = get_db()
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists.")

    username = payload.username.strip().lower()
    _validate_username_format(username)
    if await db.users.find_one({"username": username}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That username is already taken.")

    user = await db.users.insert_one({
        "email": payload.email,
        "display_name": payload.display_name,
        "username": username,
        "username_confirmed": True,
        "password_hash": hash_password(payload.password),
        "date_of_birth": date_of_birth,
        "accepted_terms_at": time.time(),
        "is_premium": False,
        "is_founder": False,
        "created_at": time.time(),
    })
    try:
        await send_welcome_email(db, user)
    except Exception:
        logger.exception("Failed to send welcome email to %s", user["email"])
    token = create_access_token(user["_id"])
    return TokenOut(access_token=token, user=_to_user_out(user))


@router.post("/login", response_model=TokenOut)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = await db.users.find_one({"email": form_data.username})
    if not user or not user.get("password_hash") or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    token = create_access_token(user["_id"])
    return TokenOut(access_token=token, user=_to_user_out(user))


def _verify_google_credential(credential: str) -> dict:
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Google sign-in is not configured.")
    try:
        idinfo = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential.")
    if not idinfo.get("email"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google account has no email.")
    return idinfo


@router.post("/google", response_model=None)
async def google_auth(payload: GoogleAuthIn):
    idinfo = _verify_google_credential(payload.credential)
    email = idinfo["email"]

    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        # Brand-new account: we don't create it yet -- COPPA requires a neutral
        # age check (and we need Terms acceptance) before any data is stored.
        # The frontend collects those next and re-submits the same credential
        # to /auth/google/finish.
        name = (idinfo.get("name") or email.split("@")[0])[:35]
        return {"needs_details": True, "email": email, "display_name": name}

    if not user.get("google_id"):
        user = await db.users.update_one({"_id": user["_id"]}, {"$set": {"google_id": idinfo.get("sub")}})

    user = await ensure_username(db, user)
    token = create_access_token(user["_id"])
    return TokenOut(access_token=token, user=_to_user_out(user))


@router.post("/google/finish", response_model=TokenOut)
async def google_auth_finish(payload: GoogleSignupFinish):
    """Creates a brand-new Google-signup account after the age/Terms step."""
    idinfo = _verify_google_credential(payload.credential)
    email = idinfo["email"]

    _require_terms_accepted(payload.accepted_terms)
    date_of_birth = _validate_birthdate(payload.date_of_birth)

    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        name = (idinfo.get("name") or email.split("@")[0])[:35]
        username = payload.username.strip().lower()
        _validate_username_format(username)
        if await db.users.find_one({"username": username}):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That username is already taken.")
        user = await db.users.insert_one({
            "email": email,
            "display_name": name,
            "username": username,
            "username_confirmed": True,
            "password_hash": None,
            "google_id": idinfo.get("sub"),
            "date_of_birth": date_of_birth,
            "accepted_terms_at": time.time(),
            "is_premium": False,
            "is_founder": False,
            "created_at": time.time(),
        })
        try:
            await send_welcome_email(db, user)
        except Exception:
            logger.exception("Failed to send welcome email to %s", user["email"])
    elif not user.get("google_id"):
        user = await db.users.update_one({"_id": user["_id"]}, {"$set": {"google_id": idinfo.get("sub")}})

    user = await ensure_username(db, user)
    token = create_access_token(user["_id"])
    return TokenOut(access_token=token, user=_to_user_out(user))
