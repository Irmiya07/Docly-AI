from motor.motor_asyncio import AsyncIOMotorClient
from app import config

client = AsyncIOMotorClient(config.MONGODB_URL)

db = client.docly_ai


def get_db():
    return db