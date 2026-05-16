"""Anomaly Detector — Isolation Forest-based transaction anomaly detection.

Uses statistical methods and Isolation Forest for detecting outlier
transactions across multiple dimensions: amount, category, time, frequency.
"""

import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from app.models.user import User
from app.models.financial import Transaction

# Try to import sklearn, fallback to pure statistical methods
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


class AnomalyDetector:
    """Detects financial anomalies using Isolation Forest + statistical methods."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)

    async def detect_anomalies(self, lookback_days: int = 90) -> Dict:
        """Run full anomaly detection pipeline."""
        transactions = await self._get_transactions(lookback_days)

        if len(transactions) < 10:
            return {"anomalies": [], "summary": "Insufficient data for analysis.", "method": "none"}

        if HAS_SKLEARN:
            result = self._isolation_forest_detect(transactions)
            result["method"] = "isolation_forest"
        else:
            result = self._statistical_detect(transactions)
            result["method"] = "statistical"

        # Add category spike analysis
        cat_spikes = await self._category_spike_analysis()
        result["category_spikes"] = cat_spikes

        # Generate summary
        n_anomalies = len(result["anomalies"])
        result["summary"] = (
            f"Analyzed {len(transactions)} transactions. "
            f"Found {n_anomalies} anomalies using {result['method']} method. "
            f"{len(cat_spikes)} category spikes detected."
        )

        return result

    def _isolation_forest_detect(self, transactions: list) -> Dict:
        """Use Isolation Forest for anomaly detection."""
        # Build feature matrix
        features = []
        for t in transactions:
            features.append([
                t.amount,
                hash(t.category) % 100,  # Category encoding
                t.timestamp.hour,
                t.timestamp.weekday(),
                1 if t.is_recurring else 0,
            ])

        X = np.array(features)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
        predictions = model.fit_predict(X_scaled)
        scores = model.decision_function(X_scaled)

        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:
                t = transactions[i]
                anomalies.append({
                    "id": t.id,
                    "amount": t.amount,
                    "category": t.category,
                    "merchant": t.merchant or "Unknown",
                    "date": t.timestamp.isoformat(),
                    "anomaly_score": round(float(-score), 3),
                    "severity": "high" if score < -0.3 else "medium",
                    "reason": self._explain_anomaly(t, transactions),
                })

        anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)
        return {"anomalies": anomalies[:15]}

    def _statistical_detect(self, transactions: list) -> Dict:
        """Fallback statistical anomaly detection."""
        expenses = [t for t in transactions if t.transaction_type == "expense"]
        if not expenses:
            return {"anomalies": []}

        amounts = np.array([t.amount for t in expenses])
        mean, std = np.mean(amounts), np.std(amounts)
        threshold = mean + 2.0 * std

        # Per-category stats
        cat_stats = {}
        for t in expenses:
            cat_stats.setdefault(t.category, []).append(t.amount)

        anomalies = []
        for t in expenses:
            reasons = []
            z_score = (t.amount - mean) / max(std, 1)

            # Global outlier
            if t.amount > threshold:
                reasons.append(f"Amount ₹{t.amount:,.0f} is {z_score:.1f}σ above average")

            # Category outlier
            cat_amounts = cat_stats.get(t.category, [])
            if len(cat_amounts) > 2:
                cat_mean = np.mean(cat_amounts)
                cat_std = np.std(cat_amounts)
                if cat_std > 0 and t.amount > cat_mean + 2 * cat_std:
                    reasons.append(f"Unusual for {t.category} category")

            if reasons:
                anomalies.append({
                    "id": t.id,
                    "amount": t.amount,
                    "category": t.category,
                    "merchant": t.merchant or "Unknown",
                    "date": t.timestamp.isoformat(),
                    "anomaly_score": round(float(z_score), 3),
                    "severity": "high" if z_score > 3 else "medium",
                    "reason": "; ".join(reasons),
                })

        anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)
        return {"anomalies": anomalies[:15]}

    def _explain_anomaly(self, txn, all_transactions) -> str:
        """Generate human-readable explanation for an anomaly."""
        same_cat = [t.amount for t in all_transactions if t.category == txn.category and t.transaction_type == "expense"]
        if same_cat:
            avg = np.mean(same_cat)
            return f"₹{txn.amount:,.0f} in {txn.category} ({txn.amount / max(avg, 1):.1f}x category average)"
        return f"Unusual ₹{txn.amount:,.0f} transaction"

    async def _category_spike_analysis(self) -> List[Dict]:
        """Compare current month vs previous month per category."""
        ms = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev = (ms - timedelta(days=1)).replace(day=1)

        r1 = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)
        ).group_by(Transaction.category))
        current = {row[0]: float(row[1]) for row in r1.all()}

        r2 = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense",
                 Transaction.timestamp >= prev, Transaction.timestamp < ms)
        ).group_by(Transaction.category))
        previous = {row[0]: float(row[1]) for row in r2.all()}

        spikes = []
        for cat, amt in current.items():
            prev_amt = previous.get(cat, 0)
            if prev_amt > 0 and amt > prev_amt * 1.5:
                spikes.append({
                    "category": cat,
                    "current": amt,
                    "previous": prev_amt,
                    "change_pct": round((amt / prev_amt - 1) * 100),
                })
        return sorted(spikes, key=lambda x: x["change_pct"], reverse=True)

    async def _get_transactions(self, days: int) -> list:
        cutoff = self.now - timedelta(days=days)
        r = await self.db.execute(select(Transaction).where(
            and_(Transaction.user_id == self.user.id, Transaction.timestamp >= cutoff)
        ).order_by(desc(Transaction.timestamp)))
        return r.scalars().all()
