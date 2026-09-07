"""
In-app notification records (the bell icon feed) -- distinct from
notifications.py, which sends emails. A single action can trigger both.
"""
import time


async def create_notification(db, recipient_id: str, actor: dict, type_: str, target_id: str = None, preview: str = None) -> None:
    if not recipient_id or recipient_id == actor["_id"]:
        return  # never notify people about their own actions
    # Blank and whitespace-only previews both become None, so clients can rely
    # on a simple truthiness check and never render empty quote marks.
    preview = (preview or "").strip() or None
    await db.notifications.insert_one({
        "recipient_id": recipient_id,
        "type": type_,
        "actor_id": actor["_id"],
        "actor_name": actor.get("display_name", "Someone"),
        "target_id": target_id,
        "preview": preview,
        "created_at": time.time(),
        "read": False,
    })


async def create_system_notification(db, recipient_id: str, type_: str, target_id: str = None, preview: str = None) -> None:
    """A notification from Inspire itself rather than from another person.

    Kept separate from create_notification because that one refuses to
    notify anybody about their own actions -- exactly right when there's an
    actor, and exactly wrong here, where the thing worth telling someone
    about is something they did themselves.
    """
    if not recipient_id:
        return
    preview = (preview or "").strip() or None
    await db.notifications.insert_one({
        "recipient_id": recipient_id,
        "type": type_,
        "actor_id": None,
        "actor_name": "Inspire",
        "target_id": target_id,
        "preview": preview,
        "created_at": time.time(),
        "read": False,
    })
