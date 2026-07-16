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
            self.aria_usage = MongoCollection(mongo_db["aria_usage"])
        else:
            self.users = InMemoryCollection()
            self.stories = InMemoryCollection()
            self.reactions = InMemoryCollection()
            self.comments = InMemoryCollection()
            self.aria_usage = InMemoryCollection()


_db_instance: Optional[DB] = None


def get_db() -> DB:
    global _db_instance
    if _db_instance is None:
        _db_instance = DB()
    return _db_instance
