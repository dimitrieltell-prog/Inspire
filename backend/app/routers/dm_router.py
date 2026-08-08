import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, is_founder
from app.database import get_db
from app.models import ConversationOut, DMMessageCreate, DMParticipant, MessageOut
from app.moderation import contains_hostility
from app.notifications import notify_new_message
from app.routers.users_router import _is_follower, can_message, is_blocked_either_way

router = APIRouter(prefix="/dms", tags=["dms"])


def _pair_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


async def _find_conversation(db, uid_a: str, uid_b: str) -> Optional[dict]:
    lo, hi = _pair_key(uid_a, uid_b)
    return await db.conversations.find_one({"user_a": lo, "user_b": hi})


def _to_participant(u: dict) -> DMParticipant:
    return DMParticipant(
        id=u["_id"],
        display_name=u["display_name"],
        username=u.get("username"),
        avatar_url=u.get("avatar_url"),
        is_founder=is_founder(u),
    )


def _shows_read_receipts(a: dict, b: dict) -> bool:
    """Reciprocal, like WhatsApp/Instagram -- turning yours off also hides
    theirs from you."""
    return a.get("show_read_receipts", True) and b.get("show_read_receipts", True)


@router.get("", response_model=list[ConversationOut])
async def list_conversations(user: dict = Depends(get_current_user)):
    db = get_db()
    convos = [c for c in await db.conversations.find({}) if user["_id"] in (c["user_a"], c["user_b"])]
    convos.sort(key=lambda c: c.get("last_message_at", 0), reverse=True)
    result = []
    for c in convos:
        other_id = c["user_b"] if c["user_a"] == user["_id"] else c["user_a"]
        other = await db.users.find_one({"_id": other_id})
        if not other:
            continue
        unread = len(await db.messages.find({
            "conversation_id": c["_id"], "sender_id": other_id, "read_at": None,
        }))
        result.append(ConversationOut(
            other_user=_to_participant(other),
            last_message=c.get("last_message", ""),
            last_message_at=c.get("last_message_at", 0),
            last_sender_id=c.get("last_sender_id", ""),
            unread_count=unread,
            accepted=c.get("accepted", True),
            requested_by=c.get("requested_by"),
        ))
    return result


@router.get("/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    db = get_db()
    convos = [c for c in await db.conversations.find({}) if user["_id"] in (c["user_a"], c["user_b"])]
    total = 0
    for c in convos:
        other_id = c["user_b"] if c["user_a"] == user["_id"] else c["user_a"]
        total += len(await db.messages.find({"conversation_id": c["_id"], "sender_id": other_id, "read_at": None}))
        # A pending request waiting on this user's decision always counts,
        # even once its messages have been read/previewed.
        if not c.get("accepted", True) and c.get("requested_by") == other_id:
            total += 1
    return {"count": total}


@router.get("/{other_id}/messages", response_model=list[MessageOut])
async def get_thread(other_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    other = await db.users.find_one({"_id": other_id})
    if not other:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    convo = await _find_conversation(db, user["_id"], other_id)
    if not convo:
        return []
    messages = await db.messages.find({"conversation_id": convo["_id"]}, sort_key="created_at", reverse=False)
    show_receipts = _shows_read_receipts(user, other)
    return [
        MessageOut(
            id=m["_id"],
            sender_id=m["sender_id"],
            body=m["body"],
            created_at=m["created_at"],
            read_at=m.get("read_at") if show_receipts else None,
        )
        for m in messages
    ]


@router.post("/{other_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(other_id: str, payload: DMMessageCreate, user: dict = Depends(get_current_user)):
    if other_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't message yourself.")
    db = get_db()
    other = await db.users.find_one({"_id": other_id})
    if not other:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if contains_hostility(payload.body):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Let's keep this space respectful — please remove any hurtful language and try again.",
        )
    convo = await _find_conversation(db, user["_id"], other_id)
    is_new = convo is None
    if is_new:
        if not await can_message(db, user, other):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't message this account.")
    elif await is_blocked_either_way(db, user["_id"], other_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't message this account.")

    now = time.time()
    preview = payload.body[:120]
    if not convo:
        # A DM only skips the request queue once you've both already
        # followed each other -- the sender had to follow the recipient to
        # get here at all (or the recipient is open to everyone), but it's
        # only a direct message, not a request, if the recipient already
        # follows the sender back too.
        accepted = await _is_follower(db, other_id, user["_id"])
        lo, hi = _pair_key(user["_id"], other_id)
        convo = await db.conversations.insert_one({
            "user_a": lo, "user_b": hi,
            "created_at": now, "last_message_at": now,
            "last_message": preview, "last_sender_id": user["_id"],
            "accepted": accepted,
            "requested_by": None if accepted else user["_id"],
        })
    else:
        updates = {"last_message_at": now, "last_message": preview, "last_sender_id": user["_id"]}
        # The other side replying to a still-pending request they received
        # is exactly the "accept" signal -- no need to make them click
        # Accept first if they've already started typing back.
        if not convo.get("accepted", True) and convo.get("requested_by") != user["_id"]:
            updates["accepted"] = True
        await db.conversations.update_one({"_id": convo["_id"]}, {"$set": updates})

    message = await db.messages.insert_one({
        "conversation_id": convo["_id"], "sender_id": user["_id"],
        "body": payload.body, "created_at": now, "read_at": None,
    })

    if is_new:
        await notify_new_message(other, user)

    return MessageOut(id=message["_id"], sender_id=message["sender_id"], body=message["body"], created_at=message["created_at"], read_at=None)


@router.post("/{other_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_request(other_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    convo = await _find_conversation(db, user["_id"], other_id)
    if not convo or convo.get("accepted", True):
        return
    if convo.get("requested_by") == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't accept your own message request.")
    await db.conversations.update_one({"_id": convo["_id"]}, {"$set": {"accepted": True}})


@router.delete("/{other_id}/request", status_code=status.HTTP_204_NO_CONTENT)
async def decline_request(other_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    convo = await _find_conversation(db, user["_id"], other_id)
    if not convo or convo.get("accepted", True) or convo.get("requested_by") == user["_id"]:
        return
    await db.messages.delete_many({"conversation_id": convo["_id"]})
    await db.conversations.delete_one({"_id": convo["_id"]})


@router.post("/{other_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(other_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    convo = await _find_conversation(db, user["_id"], other_id)
    if not convo:
        return
    unread = await db.messages.find({"conversation_id": convo["_id"], "sender_id": other_id, "read_at": None})
    now = time.time()
    for m in unread:
        await db.messages.update_one({"_id": m["_id"]}, {"$set": {"read_at": now}})
