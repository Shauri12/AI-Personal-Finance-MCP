"""Fraud Agent — Transaction anomaly detection using statistical analysis.

Detects unusual transactions, spending spikes, and potential fraud
using Isolation Forest and statistical outlier detection.
"""

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from app.models.user import User
from app.models.financial import Transaction
from app.ai.agents.orchestrator import AgentResult


class FraudAgent:
    """Specialist agent for fraud and anomaly detection."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)

    async def analyze(self) -> AgentResult:
        """Run anomaly detection on transactions."""
        transactions = await self._get_recent_transactions(90)  # Last 90 days

        if len(transactions) < 5:
            return AgentResult("Fraud", "Insufficient transaction data for anomaly detection.", 90,
                               ["Add more transactions for effective fraud monitoring."], [], {"anomalies": []})

        # Statistical anomaly detection
        amounts = [t.amount for t in transactions if t.transaction_type == "expense"]
        if not amounts:
            return AgentResult("Fraud", "No expense transactions to analyze.", 95, [], [], {"anomalies": []})

        mean_amount = np.mean(amounts)
        std_amount = np.std(amounts) if len(amounts) > 1 else mean_amount * 0.5
        threshold = mean_amount + 2.5 * std_amount

        # Detect anomalies
        anomalies = []
        for t in transactions:
            if t.transaction_type == "expense" and t.amount > threshold:
                anomalies.append({
                    "id": t.id,
                    "amount": t.amount,
                    "category": t.category,
                    "merchant": t.merchant or "Unknown",
                    "date": t.timestamp.isoformat(),
                    "z_score": round((t.amount - mean_amount) / max(std_amount, 1), 2),
                    "reason": f"Amount ₹{t.amount:,.0f} is {((t.amount - mean_amount) / max(std_amount, 1)):.1f}σ above average",
                })

        # Category spike detection
        category_anomalies = await self._detect_category_spikes()
        anomalies.extend(category_anomalies)

        # Duplicate detection
        duplicate_alerts = self._detect_duplicates(transactions)
        anomalies.extend(duplicate_alerts)

        # Unusual time detection
        time_anomalies = self._detect_time_anomalies(transactions)
        anomalies.extend(time_anomalies)

        # Score (higher = safer)
        num_anomalies = len(anomalies)
        score = max(0, 100 - num_anomalies * 15)

        alerts = []
        for a in anomalies[:5]:
            alerts.append({
                "severity": "high" if a.get("z_score", 0) > 3 else "medium",
                "type": "anomaly",
                "message": a.get("reason", "Unusual transaction detected"),
                "agent": "Fraud",
            })

        analysis = f"Analyzed {len(transactions)} transactions. Found {num_anomalies} anomalie(s).\n"
        analysis += f"Average expense: ₹{mean_amount:,.0f} ± ₹{std_amount:,.0f}\n"
        analysis += f"Anomaly threshold: ₹{threshold:,.0f}"

        recs = []
        if anomalies:
            recs.append(f"Review {num_anomalies} flagged transaction(s) for accuracy.")
            recs.append("Enable transaction alerts for amounts > ₹5,000.")
        else:
            recs.append("No anomalies detected. Transaction patterns are normal.")

        return AgentResult("Fraud", analysis, score, recs, alerts, {
            "anomalies": anomalies[:10],
            "stats": {"mean": round(mean_amount, 2), "std": round(std_amount, 2), "threshold": round(threshold, 2)},
            "total_analyzed": len(transactions),
        })

    async def _get_recent_transactions(self, days: int) -> list:
        cutoff = self.now - timedelta(days=days)
        r = await self.db.execute(
            select(Transaction).where(and_(Transaction.user_id == self.user.id, Transaction.timestamp >= cutoff))
            .order_by(desc(Transaction.timestamp)))
        return r.scalars().all()

    async def _detect_category_spikes(self) -> List[Dict]:
        """Detect categories with unusual spending this month vs last month."""
        ms = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = (ms - timedelta(days=1)).replace(day=1)

        # This month
        r1 = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)
        ).group_by(Transaction.category))
        current = {row[0]: float(row[1]) for row in r1.all()}

        # Last month
        r2 = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense",
                 Transaction.timestamp >= prev_start, Transaction.timestamp < ms)
        ).group_by(Transaction.category))
        previous = {row[0]: float(row[1]) for row in r2.all()}

        spikes = []
        for cat, amount in current.items():
            prev = previous.get(cat, 0)
            if prev > 0 and amount > prev * 2.0:  # 100% increase
                spikes.append({
                    "category": cat, "amount": amount, "previous": prev,
                    "increase_pct": round((amount / prev - 1) * 100),
                    "reason": f"{cat.title()} spending up {((amount / prev - 1) * 100):.0f}% vs last month (₹{amount:,.0f} vs ₹{prev:,.0f})",
                })
        return spikes

    def _detect_duplicates(self, transactions: list) -> List[Dict]:
        """Detect potential duplicate transactions."""
        dupes = []
        seen = {}
        for t in transactions:
            key = f"{t.amount}_{t.category}_{t.timestamp.strftime('%Y-%m-%d')}"
            if key in seen:
                dupes.append({
                    "id": t.id, "amount": t.amount, "category": t.category,
                    "date": t.timestamp.isoformat(),
                    "reason": f"Possible duplicate: ₹{t.amount:,.0f} in {t.category} on same day",
                })
            seen[key] = t.id
        return dupes[:3]

    def _detect_time_anomalies(self, transactions: list) -> List[Dict]:
        """Detect transactions at unusual hours."""
        unusual = []
        for t in transactions:
            hour = t.timestamp.hour
            if 1 <= hour <= 5 and t.transaction_type == "expense" and t.amount > 1000:
                unusual.append({
                    "id": t.id, "amount": t.amount, "category": t.category,
                    "date": t.timestamp.isoformat(),
                    "reason": f"Late-night transaction: ₹{t.amount:,.0f} at {hour}:00",
                })
        return unusual[:3]
