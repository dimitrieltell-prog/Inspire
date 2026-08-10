"""
Data layer with two backends behind the same simple async interface:

- InMemoryCollection: a dict-based store, zero setup, used when USE_MONGO=false.
  Great for local development and this demo -- data resets when the process stops.
- MongoCollection: a thin wrapper around a real motor (async MongoDB) collection,
  used when USE_MONGO=true.

Routers only ever talk to `get_db()` and never care which backend is active.
To go live with real MongoDB: set USE_MONGO=true and MONGO_URI in .env -- no
router code needs to change.
"""
import itertools
import uuid
from typing import Any, Optional

from app.config import settings


class InMemoryCollection:
    def __init__(self):
        self._docs: dict[str, dict] = {}

    async def insert_one(self, doc: dict) -> dict:
        doc = dict(doc)
        doc["_id"] = doc.get("_id") or str(uuid.uuid4())
        self._docs[doc["_id"]] = doc
        return doc

    async def find_one(self, query: dict) -> Optional[dict]:
        for doc in self._docs.values():
            if _matches(doc, query):
                return doc
        return None

    async def find(self, query: dict = None, sort_key: str = None, reverse: bool = True) -> list[dict]:
        query = query or {}
        results = [doc for doc in self._docs.values() if _matches(doc, query)]
        if sort_key:
            results.sort(key=lambda d: d.get(sort_key, 0), reverse=reverse)
        return results

    async def update_one(self, query: dict, update: dict) -> Optional[dict]:
        doc = await self.find_one(query)
        if not doc:
            return None
        doc.update(update.get("$set", {}))
        for field, amount in update.get("$inc", {}).items():
            doc[field] = doc.get(field, 0) + amount
        return doc

    async def delete_one(self, query: dict) -> bool:
        doc = await self.find_one(query)
        if not doc:
            return False
        del self._docs[doc["_id"]]
        return True

    async def delete_many(self, query: dict) -> int:
        matches = [d["_id"] for d in self._docs.values() if _matches(d, query)]
        for _id in matches:
            del self._docs[_id]
        return len(matches)

    async def create_index(self, *args, **kwargs) -> None:
        pass


def _matches(doc: dict, query: dict) -> bool:
    return all(doc.get(k) == v for k, v in query.items())


class MongoCollection:
    """Thin wrapper matching the same interface, backed by a real motor collection."""

    def __init__(self, collection):
        self._c = collection

    async def insert_one(self, doc: dict) -> dict:
        doc = dict(doc)
        doc["_id"] = doc.get("_id") or str(uuid.uuid4())
        await self._c.insert_one(doc)
        return doc

    async def find_one(self, query: dict) -> Optional[dict]:
        return await self._c.find_one(query)

    async def find(self, query: dict = None, sort_key: str = None, reverse: bool = True) -> list[dict]:
        cursor = self._c.find(query or {})
        if sort_key:
            cursor = cursor.sort(sort_key, -1 if reverse else 1)
        return [doc async for doc in cursor]

    async def update_one(self, query: dict, update: dict) -> Optional[dict]:
        await self._c.update_one(query, update)
        return await self.find_one(query)

    async def delete_one(self, query: dict) -> bool:
        result = await self._c.delete_one(query)
        return result.deleted_count > 0

    async def delete_many(self, query: dict) -> int:
        result = await self._c.delete_many(query)
        return result.deleted_count

    async def create_index(self, *args, **kwargs) -> None:
        await self._c.create_index(*args, **kwargs)


class DB:
    """Holds one collection instance per entity type."""

    def __init__(self):
        if settings.use_mongo:
            from motor.motor_asyncio import AsyncIOMotorClient

            client = AsyncIOMotorClient(settings.mongo_uri)
            mongo_db = client[settings.mongo_db_name]
            self.users = MongoCollection(mongo_db["users"])
            self.stories = MongoCollection(mongo_db["stories"])
            self.reactions = MongoCollection(mongo_db["reactions"])
            self.comments = MongoCollection(mongo_db["comments"])
            self.follows = MongoCollection(mongo_db["follows"])
            self.reposts = MongoCollection(mongo_db["reposts"])
            self.saves = MongoCollection(mongo_db["saves"])
            self.blocks = MongoCollection(mongo_db["blocks"])
            self.close_circle = MongoCollection(mongo_db["close_circle"])
            self.mutes = MongoCollection(mongo_db["mutes"])
            self.follow_requests = MongoCollection(mongo_db["follow_requests"])
            self.ephemeral_stories = MongoCollection(mongo_db["ephemeral_stories"])
            self.story_likes = MongoCollection(mongo_db["story_likes"])
            self.story_replies = MongoCollection(mongo_db["story_replies"])
            self.story_sends = MongoCollection(mongo_db["story_sends"])
            self.aria_usage = MongoCollection(mongo_db["aria_usage"])
            self.reports = MongoCollection(mongo_db["reports"])
            self.conversations = MongoCollection(mongo_db["conversations"])
            self.messages = MongoCollection(mongo_db["messages"])
            self.founder_story_views = MongoCollection(mongo_db["founder_story_views"])
            self.notifications = MongoCollection(mongo_db["notifications"])
        else:
            self.users = InMemoryCollection()
            self.stories = InMemoryCollection()
            self.reactions = InMemoryCollection()
            self.comments = InMemoryCollection()
            self.follows = InMemoryCollection()
            self.reposts = InMemoryCollection()
            self.saves = InMemoryCollection()
            self.blocks = InMemoryCollection()
            self.close_circle = InMemoryCollection()
            self.mutes = InMemoryCollection()
            self.follow_requests = InMemoryCollection()
            self.ephemeral_stories = InMemoryCollection()
            self.story_likes = InMemoryCollection()
            self.story_replies = InMemoryCollection()
            self.story_sends = InMemoryCollection()
            self.aria_usage = InMemoryCollection()
            self.reports = InMemoryCollection()
            self.conversations = InMemoryCollection()
            self.messages = InMemoryCollection()
            self.founder_story_views = InMemoryCollection()
            self.notifications = InMemoryCollection()


_db_instance: Optional[DB] = None


def get_db() -> DB:
    global _db_instance
    if _db_instance is None:
        _db_instance = DB()
    return _db_instance
