"""Getting-started checklist state.

Completing a step is a moment in time, not a state to maintain -- so steps
are latched the moment the action happens, rather than being re-derived
from whether its evidence still exists. Deleting your only post shouldn't
un-finish "Share your first story".
"""

STEP_KEYS = ["story", "profile", "follow", "aria"]


async def latch_onboarding_step(db, user_id: str, key: str) -> None:
    """Record a step as done, permanently. Safe to call on every action --
    it only writes the first time."""
    user = await db.users.find_one({"_id": user_id})
    if not user:
        return
    done = set(user.get("onboarding_done") or [])
    if key in done:
        return
    done.add(key)
    await db.users.update_one({"_id": user_id}, {"$set": {"onboarding_done": sorted(done)}})
