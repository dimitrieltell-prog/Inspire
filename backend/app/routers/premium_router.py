import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.routers.auth_router import _to_user_out

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/premium", tags=["premium"])


@router.post("/checkout")
async def create_checkout_session(user: dict = Depends(get_current_user)):
    if not settings.stripe_secret_key or not settings.stripe_price_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Payments are not configured yet.")

    stripe.api_key = settings.stripe_secret_key
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
            customer_email=user["email"],
            client_reference_id=user["_id"],
            metadata={"user_id": user["_id"]},
            success_url=f"{settings.frontend_url}/premium?checkout=success",
            cancel_url=f"{settings.frontend_url}/premium?checkout=canceled",
        )
    except stripe.StripeError as e:
        logger.error("Stripe checkout session creation failed: %s", e)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not start checkout. Please try again shortly.")
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Webhook is not configured.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook signature.")

    db = get_db()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id") or session.get("metadata", {}).get("user_id")
        if user_id:
            await db.users.update_one(
                {"_id": user_id},
                {"$set": {
                    "is_premium": True,
                    "stripe_customer_id": session.get("customer"),
                    "stripe_subscription_id": session.get("subscription"),
                }},
            )

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.updated"):
        subscription = event["data"]["object"]
        if subscription.get("status") in ("canceled", "unpaid", "incomplete_expired"):
            await db.users.update_one(
                {"stripe_subscription_id": subscription["id"]},
                {"$set": {"is_premium": False}},
            )

    return {"received": True}


@router.post("/mock-upgrade", response_model=None)
async def mock_upgrade(user: dict = Depends(get_current_user)):
    """Dev-only fallback for local testing without Stripe configured. Disabled once
    STRIPE_SECRET_KEY is set so it can never be used to bypass real payment in production."""
    if settings.stripe_secret_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    db = get_db()
    updated = await db.users.update_one({"_id": user["_id"]}, {"$set": {"is_premium": True}})
    return _to_user_out(updated)
