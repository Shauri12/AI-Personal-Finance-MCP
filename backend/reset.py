import asyncio
from sqlalchemy import select
from app.core.database import async_session
from app.models.user import User
from app.core.security import get_password_hash

async def reset_pwd():
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.email == 'demo@finmcp.ai'))).scalar_one()
        user.hashed_password = get_password_hash('demo123')
        await db.commit()
        print('Password reset successfully!')

asyncio.run(reset_pwd())
