"""
IDSS AI Service — Configuration
Reads from .env or falls back to defaults matching the Node.js backend.
"""
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/PFE_NATATION")
DB_NAME   = os.getenv("DB_NAME", "PFE_NATATION")
PORT      = int(os.getenv("AI_PORT", "8000"))
