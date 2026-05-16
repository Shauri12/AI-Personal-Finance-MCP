"""Advanced AI API routes — Multi-agent, Predictions, Anomalies, Reports, Budget Engine."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/ai", tags=["AI Advanced"])


@router.get("/agents/report")
async def get_agent_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run all AI agents and return comprehensive financial report."""
    from app.ai.agents.orchestrator import MultiAgentOrchestrator
    orchestrator = MultiAgentOrchestrator(current_user, db)
    return await orchestrator.get_comprehensive_report()


@router.get("/agents/{agent_name}")
async def run_single_agent(
    agent_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run a specific AI agent (budget, investment, debt, savings, fraud)."""
    from app.ai.agents.orchestrator import MultiAgentOrchestrator
    orchestrator = MultiAgentOrchestrator(current_user, db)
    result = await orchestrator.run_agent(agent_name)
    return result.to_dict()


@router.get("/predict")
async def get_predictions(
    months: int = 3,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get spending/income forecasts for the next N months."""
    from app.ai.ml.forecaster import FinancialForecaster
    forecaster = FinancialForecaster(current_user, db)
    return await forecaster.forecast_spending(months_ahead=months)


@router.get("/anomalies")
async def get_anomalies(
    days: int = 90,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detect transaction anomalies using Isolation Forest / statistical methods."""
    from app.ai.ml.anomaly_detector import AnomalyDetector
    detector = AnomalyDetector(current_user, db)
    return await detector.detect_anomalies(lookback_days=days)


@router.get("/budget/smart")
async def get_smart_budget(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-optimized budget allocation based on spending patterns."""
    from app.ai.ml.smart_budget import SmartBudgetEngine
    engine = SmartBudgetEngine(current_user, db)
    return await engine.generate_smart_budget()


@router.get("/budget/status")
async def get_budget_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time budget utilization status for current month."""
    from app.ai.ml.smart_budget import SmartBudgetEngine
    engine = SmartBudgetEngine(current_user, db)
    return await engine.get_budget_status()


@router.get("/report/monthly")
async def get_monthly_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate comprehensive AI monthly financial report."""
    from app.ai.agents.orchestrator import MultiAgentOrchestrator
    from app.ai.ml.forecaster import FinancialForecaster

    orchestrator = MultiAgentOrchestrator(current_user, db)
    forecaster = FinancialForecaster(current_user, db)

    agent_report = await orchestrator.get_comprehensive_report()
    forecast = await forecaster.forecast_spending(months_ahead=3)

    now = datetime.now(timezone.utc)
    return {
        "report_date": now.isoformat(),
        "report_month": now.strftime("%B %Y"),
        "user": current_user.full_name,
        "overall_score": agent_report["overall_score"],
        "agent_scores": agent_report["agent_scores"],
        "summary": agent_report["summary"],
        "alerts": agent_report["alerts"],
        "recommendations": agent_report["recommendations"],
        "forecast": forecast.get("forecasts", []),
        "forecast_insights": forecast.get("insights", []),
        "spending_trends": forecast.get("trends", {}),
    }
