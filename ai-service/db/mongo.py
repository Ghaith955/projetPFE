"""
MongoDB connection pool — shared across all modules.
Uses pymongo to connect directly to the same DB as the Node.js backend.
"""
from pymongo import MongoClient
from config import MONGO_URI, DB_NAME

_client = None

def get_db():
    """Return the pymongo database object (lazy singleton)."""
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client[DB_NAME]

def get_collection(name: str):
    """Shorthand to get a collection by name."""
    return get_db()[name]
