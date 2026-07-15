"""
Mock premium upgrade. Flips is_premium on the user record directly so the rest
of the app (Aria limits, etc.) can be demoed end-to-end.

To go live: replace this with a real Stripe Checkout session (create session
in POST /premium/checkout, then flip is_premium from a verified Stripe webhook
in POST /premium/webhook, never from a client-callable endpoint like this one).
"""
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_db
from app.routers.auth_router import _to_user_out

router = APIRouter(prefix="/premium", tags=["premium"])


@router.post("/mock-upgrade", response_model=None)
async def mock_upgrade(user: dict = Depends(get_current_user)):
    db = get_db()
    updated = await db.users.update_one({"_id": user["_id"]}, {"$set": {"is_premium": True}})
    return _to_user_out(updated)
