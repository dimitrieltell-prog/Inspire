import re
import time

from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models import GoogleAuthIn, ProfileUpdate, TokenOut, UserLogin, UserOut, UserRegister
from app.moderation import contains_hostility

router = APIRouter(prefix="/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,30}$")


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
        is_premium=is_premium,
        is_founder=is_founder,
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
        if not USERNAME_RE.match(uname):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Username must be 3–30 characters: letters, numbers, or underscores.")
        if contains_hostility(uname):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a username without offensive language.")
        taken = await db.users.find_one({"username": uname})
        if taken and taken["_id"] != user["_id"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That username is already taken.")
        updates["username"] = uname

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


@router.post("/register", response_model=TokenOut)
async def register(payload: UserRegister):
    if contains_hostility(payload.display_name):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a display name without offensive language.")

    db = get_db()
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists.")

    username = await _generate_username(db, payload.display_name)
    user = await db.users.insert_one({
        "email": payload.email,
        "display_name": payload.display_name,
        "username": username,
        "password_hash": hash_password(payload.password),
        "is_premium": False,
        "is_founder": False,
        "created_at": time.time(),
    })
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


@router.post("/google", response_model=TokenOut)
async def google_auth(payload: GoogleAuthIn):
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Google sign-in is not configured.")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential.")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google account has no email.")

    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        name = idinfo.get("name") or email.split("@")[0]
        username = await _generate_username(db, name)
        user = await db.users.insert_one({
            "email": email,
            "display_name": name,
            "username": username,
            "password_hash": None,
            "google_id": idinfo.get("sub"),
            "is_premium": False,
            "is_founder": False,
            "created_at": time.time(),
        })
    elif not user.get("google_id"):
        user = await db.users.update_one({"_id": user["_id"]}, {"$set": {"google_id": idinfo.get("sub")}})

    user = await ensure_username(db, user)
    token = create_access_token(user["_id"])
    return TokenOut(access_token=token, user=_to_user_out(user))
