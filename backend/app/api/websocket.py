"""WebSocket real-time alerts — Push financial alerts to connected clients."""

import json
import asyncio
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session

router = APIRouter(tags=["WebSocket"])


class AlertManager:
    """Manages WebSocket connections and pushes real-time alerts."""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_alert(self, user_id: int, alert: Dict):
        if user_id in self.active_connections:
            dead = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(alert)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active_connections[user_id].discard(ws)

    async def broadcast(self, alert: Dict):
        for user_id in list(self.active_connections.keys()):
            await self.send_alert(user_id, alert)


alert_manager = AlertManager()


@router.websocket("/ws/alerts/{user_id}")
async def websocket_alerts(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time financial alerts."""
    await alert_manager.connect(websocket, user_id)

    # Send welcome message
    await websocket.send_json({
        "type": "connected",
        "message": "Real-time alerts active",
        "user_id": user_id,
    })

    try:
        # Start background alert checker
        check_task = asyncio.create_task(_periodic_alert_check(user_id))

        while True:
            # Keep connection alive, handle incoming messages
            data = await websocket.receive_text()
            msg = json.loads(data) if data else {}

            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg.get("type") == "request_alerts":
                await _send_current_alerts(websocket, user_id)

    except WebSocketDisconnect:
        check_task.cancel()
        alert_manager.disconnect(websocket, user_id)
    except Exception:
        alert_manager.disconnect(websocket, user_id)


async def _periodic_alert_check(user_id: int):
    """Periodically check for new alerts and push them."""
    while True:
        await asyncio.sleep(60)  # Check every 60 seconds
        try:
            async with async_session() as db:
                from app.models.user import User
                from sqlalchemy import select
                r = await db.execute(select(User).where(User.id == user_id))
                user = r.scalar_one_or_none()
                if not user:
                    continue

                # Run fraud agent for real-time anomaly alerts
                from app.ai.agents.fraud_agent import FraudAgent
                fraud = FraudAgent(user, db)
                result = await fraud.analyze()

                for alert_data in result.alerts[:3]:
                    await alert_manager.send_alert(user_id, {
                        "type": "alert",
                        "severity": alert_data["severity"],
                        "message": alert_data["message"],
                        "agent": alert_data.get("agent", "Fraud"),
                        "timestamp": __import__("datetime").datetime.now().isoformat(),
                    })

                # Budget status alerts
                from app.ai.ml.smart_budget import SmartBudgetEngine
                budget = SmartBudgetEngine(user, db)
                status = await budget.get_budget_status()
                for ba in status.get("alerts", [])[:2]:
                    await alert_manager.send_alert(user_id, {
                        "type": "budget_alert",
                        "severity": ba["severity"],
                        "message": ba["message"],
                        "category": ba.get("category"),
                        "timestamp": __import__("datetime").datetime.now().isoformat(),
                    })
        except Exception:
            pass  # Silently handle errors in background task


async def _send_current_alerts(websocket: WebSocket, user_id: int):
    """Send current alerts on demand."""
    try:
        async with async_session() as db:
            from app.models.user import User
            from sqlalchemy import select
            r = await db.execute(select(User).where(User.id == user_id))
            user = r.scalar_one_or_none()
            if not user:
                return

            from app.ai.agents.fraud_agent import FraudAgent
            fraud = FraudAgent(user, db)
            result = await fraud.analyze()
            await websocket.send_json({
                "type": "alerts_batch",
                "alerts": [a for a in result.alerts[:5]],
            })
    except Exception:
        pass
