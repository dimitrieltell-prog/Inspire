import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.routers.auth_router import _to_user_out

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/premium", tags=["premium"])

# Annual plan is pure savings framing on the same product -- $39.99/yr works out to
# ~$3.33/mo, a genuine ~33% discount off paying monthly ($4.99 x 12 = $59.88).
# Built via Stripe's inline price_data so it needs no separate Price object set up
# in the Stripe dashboard -- the existing monthly Price ID is left untouched since
# real subscribers are already tied to it.
ANNUAL_PRICE_CENTS = 3999
TRIAL_PERIOD_DAYS = 7


@router.post("/checkout")
async def create_checkout_session(interval: str = "month", user: dict = Depends(get_current_user)):
    if interval not in ("month", "year"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "interval must be 'month' or 'year'.")
    if not settings.stripe_secret_key or not settings.stripe_price_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Payments are not configured yet.")

    stripe.api_key = settings.stripe_secret_key

    if interval == "year":
        line_item = {
            "price_data": {
                "currency": "usd",
                "unit_amount": ANNUAL_PRICE_CENTS,
                "recurring": {"interval": "year"},
                "product_data": {"name": "Inspire Premium (Annual)"},
            },
            "quantity": 1,
        }
    else:
        line_item = {"price": settings.stripe_price_id, "quantity": 1}

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[line_item],
            subscription_data={"trial_period_days": TRIAL_PERIOD_DAYS},
            customer_email=user["email"],
            client_reference_id=user["_id"],
            metadata={"user_id": user["_id"], "plan": interval},
            success_url=f"{settings.frontend_url}/premium?checkout=success",
            cancel_url=f"{settings.frontend_url}/premium?checkout=canceled",
        )
    except stripe.StripeError as e:
        logger.error("Stripe checkout session creation failed: %s", e)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not start checkout. Please try again shortly.")
    return {"checkout_url": session.url}


@router.post("/portal")
async def create_portal_session(user: dict = Depends(get_current_user)):
    if not settings.stripe_secret_key:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Payments are not configured yet.")
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No subscription found for this account.")

    stripe.api_key = settings.stripe_secret_key
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.frontend_url}/premium",
        )
    except stripe.StripeError as e:
        logger.error("Stripe billing portal session creation failed: %s", e)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not open the billing portal. Please try again shortly.")
    return {"portal_url": session.url}


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
