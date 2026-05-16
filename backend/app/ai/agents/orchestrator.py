"""Multi-Agent Orchestrator — Coordinates specialized financial AI agents.

Routes user queries and financial data to the appropriate specialist agent,
then aggregates insights for a unified response. Supports parallel agent
execution for comprehensive financial analysis.
"""

import asyncio
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User


class AgentResult:
    """Standardized result from any specialist agent."""

    def __init__(self, agent_name: str, analysis: str, score: float = 0.0,
                 recommendations: List[str] = None, alerts: List[Dict] = None,
                 data: Dict = None):
        self.agent_name = agent_name
        self.analysis = analysis
        self.score = score
        self.recommendations = recommendations or []
        self.alerts = alerts or []
        self.data = data or {}

    def to_dict(self) -> Dict:
        return {
            "agent": self.agent_name,
            "analysis": self.analysis,
            "score": self.score,
            "recommendations": self.recommendations,
            "alerts": self.alerts,
            "data": self.data,
        }


class MultiAgentOrchestrator:
    """Orchestrates multiple specialist financial agents.

    Agents:
      - BudgetAgent: Budget optimization and spending analysis
      - InvestmentAgent: Portfolio analysis and investment recommendations
      - DebtAgent: Debt management and payoff strategies
      - SavingsAgent: Savings optimization and goal tracking
      - FraudAgent: Transaction anomaly detection and fraud alerts
    """

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db

        # Lazy imports to avoid circular dependencies
        from app.ai.agents.budget_agent import BudgetAgent
        from app.ai.agents.investment_agent import InvestmentAgent
        from app.ai.agents.debt_agent import DebtAgent
        from app.ai.agents.savings_agent import SavingsAgent
        from app.ai.agents.fraud_agent import FraudAgent

        self.agents = {
            "budget": BudgetAgent(user, db),
            "investment": InvestmentAgent(user, db),
            "debt": DebtAgent(user, db),
            "savings": SavingsAgent(user, db),
            "fraud": FraudAgent(user, db),
        }

    async def run_all_agents(self) -> Dict[str, AgentResult]:
        """Run all agents in parallel and collect results."""
        tasks = {
            name: asyncio.create_task(agent.analyze())
            for name, agent in self.agents.items()
        }

        results = {}
        for name, task in tasks.items():
            try:
                results[name] = await task
            except Exception as e:
                results[name] = AgentResult(
                    agent_name=name,
                    analysis=f"Agent error: {str(e)}",
                    score=0.0,
                )

        return results

    async def run_agent(self, agent_name: str) -> AgentResult:
        """Run a specific agent by name."""
        if agent_name not in self.agents:
            return AgentResult(
                agent_name=agent_name,
                analysis=f"Unknown agent: {agent_name}",
                score=0.0,
            )

        try:
            return await self.agents[agent_name].analyze()
        except Exception as e:
            return AgentResult(
                agent_name=agent_name,
                analysis=f"Agent error: {str(e)}",
                score=0.0,
            )

    async def get_comprehensive_report(self) -> Dict[str, Any]:
        """Generate a comprehensive financial report from all agents."""
        results = await self.run_all_agents()

        # Aggregate scores
        scores = {name: r.score for name, r in results.items() if r.score > 0}
        overall_score = sum(scores.values()) / max(len(scores), 1)

        # Collect all alerts
        all_alerts = []
        for r in results.values():
            all_alerts.extend(r.alerts)

        # Priority sort alerts
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_alerts.sort(key=lambda a: severity_order.get(a.get("severity", "low"), 4))

        # Collect all recommendations
        all_recommendations = []
        for r in results.values():
            for rec in r.recommendations[:3]:  # Top 3 from each agent
                all_recommendations.append({
                    "agent": r.agent_name,
                    "recommendation": rec,
                })

        return {
            "overall_score": round(overall_score, 1),
            "agent_scores": scores,
            "agent_results": {name: r.to_dict() for name, r in results.items()},
            "alerts": all_alerts[:10],  # Top 10 alerts
            "recommendations": all_recommendations,
            "summary": self._generate_summary(results, overall_score),
        }

    def _generate_summary(self, results: Dict[str, AgentResult], overall_score: float) -> str:
        """Generate a narrative summary from all agent results."""
        parts = [f"## 🧠 AI Financial Intelligence Report\n"]
        parts.append(f"**Overall Financial Health: {overall_score:.0f}/100**\n")

        for name, result in results.items():
            emoji = {"budget": "📊", "investment": "💼", "debt": "💳",
                     "savings": "💰", "fraud": "🛡️"}.get(name, "📋")
            parts.append(f"\n### {emoji} {name.title()} Agent")
            parts.append(f"Score: **{result.score:.0f}/100**")
            parts.append(result.analysis[:300])  # First 300 chars

            if result.alerts:
                critical = [a for a in result.alerts if a.get("severity") == "critical"]
                if critical:
                    parts.append(f"⚠️ **{len(critical)} critical alert(s) detected!**")

        return "\n".join(parts)
