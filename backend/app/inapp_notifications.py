"""
In-app notification records (the bell icon feed) -- distinct from
notifications.py, which sends emails. A single action can trigger both.
"""
import time


async def create_notification(db, recipient_id: str, actor: dict, type_: str, target_id: str = None, preview: str = None) -> None:
    if not recipient_id or recipient_id == actor["_id"]:
        return  # never notify people about their own actions
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
