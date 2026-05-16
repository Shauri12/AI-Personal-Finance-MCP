import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.core.database import async_session
from app.models.user import User
from sqlalchemy import select
from app.ai.agents.orchestrator import MultiAgentOrchestrator

async def test():
    async with async_session() as db:
        # Get demo user
        r = await db.execute(select(User).where(User.email == "demo@finmcp.ai"))
        user = r.scalar_one_or_none()
        if not user:
            print("Demo user not found")
            return

        print(f"Testing orchestrator for user: {user.full_name}")
        orchestrator = MultiAgentOrchestrator(user, db)
        try:
            report = await orchestrator.get_comprehensive_report()
            print("Report generated successfully")
            print(f"Score: {report['overall_score']}")
        except Exception as e:
            print(f"FAILED: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
