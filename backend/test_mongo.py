import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_connection():
    try:
        client = AsyncIOMotorClient('mongodb://localhost:27017')
        # Test connection
        result = await client.admin.command('ismaster')
        print("✅ MongoDB connection successful!")
        print(f"MongoDB version: {result.get('version', 'unknown')}")
        
        # Test database access
        db = client['test_database']
        collections = await db.list_collection_names()
        print(f"Available collections: {collections}")
        
        await client.close()
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())