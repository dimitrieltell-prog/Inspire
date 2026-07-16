import time

from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models import GoogleAuthIn, TokenOut, UserLogin, UserOut, UserRegister
from app.moderation import contains_hostility

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(user: dict) -> UserOut:
    return UserOut(
        id=user["_id"],
        email=user["email"],
        display_name=user["display_name"],
        is_premium=user.get("is_premium", False),
        is_founder=user.get("is_founder", False),
    )


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return _to_user_out(user)


@router.post("/register", response_model=TokenOut)
async def register(payload: UserRegister):
    if contains_hostility(payload.display_name):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a display name without offensive language.")

    db = get_db()
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists.")

    user = await db.users.insert_one({
        "email": payload.email,
        "display_name": payload.display_name,
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
        user = await db.users.insert_one({
            "email": email,
            "display_name": idinfo.get("name") or email.split("@")[0],
            "password_hash": None,
            "google_id": idinfo.get("sub"),
            "is_premium": False,
            "is_founder": False,
            "created_at": time.time(),
        })
    elif not user.get("google_id"):
        user = await db.users.update_one({"_id": user["_id"]}, {"$set": {"google_id": idinfo.get("sub")}})

    token = create_access_token(user["_id"])
    return TokenOut(access_token=token, user=_to_user_out(user))
