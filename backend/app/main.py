import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import get_db
from app.routers import (
    admin_router,
    aria_router,
    auth_router,
    dm_router,
    ephemeral_story_router,
    me_router,
    notifications_router,
    premium_router,
    reports_router,
    search_router,
    stories_router,
    users_router,
)

app = FastAPI(title="Inspire API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(stories_router.router)
app.include_router(aria_router.router)
app.include_router(premium_router.router)
app.include_router(admin_router.router)
app.include_router(users_router.router)
app.include_router(search_router.router)
app.include_router(ephemeral_story_router.router)
app.include_router(me_router.router)
app.include_router(reports_router.router)
app.include_router(notifications_router.router)
app.include_router(dm_router.router)

logger = logging.getLogger("inspire.main")


@app.on_event("startup")
async def ensure_indexes():
    # A unique index closes the race the app-level "does this email exist"
    # check can't: two concurrent registrations (double-click, retried
    # request) can both pass that check before either insert lands. If
    # duplicate emails already exist, Mongo refuses to build the index --
    # log it instead of crashing startup, since the data needs manual
    # cleanup rather than blocking the whole app from booting.
    try:
        await get_db().users.create_index("email", unique=True)
    except Exception:
        logger.exception("Failed to create unique index on users.email")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "using_mongo": settings.use_mongo,
        "using_openai": settings.use_openai,
    }
