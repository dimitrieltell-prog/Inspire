from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import aria_router, auth_router, premium_router, stories_router

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


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "using_mongo": settings.use_mongo,
        "using_openai": settings.use_openai,
    }
