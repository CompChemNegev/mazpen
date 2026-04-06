from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


# ── In-memory event bus ───────────────────────────────────────────────────────

class EventBus:
    """Async in-memory pub/sub bus. Falls back gracefully in multi-worker setups."""

    def __init__(self) -> None:
        self._queues: list[asyncio.Queue[dict]] = []

    async def publish(self, event: dict) -> None:
        event.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        dead: list[asyncio.Queue] = []
        for q in self._queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("WebSocket subscriber queue full — dropping event")
            except Exception:
                dead.append(q)
        for q in dead:
            self._safe_remove(q)

    def subscribe(self) -> asyncio.Queue[dict]:
        q: asyncio.Queue[dict] = asyncio.Queue(maxsize=200)
        self._queues.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[dict]) -> None:
        self._safe_remove(q)

    def _safe_remove(self, q: asyncio.Queue) -> None:
        try:
            self._queues.remove(q)
        except ValueError:
            pass


# Singleton — one per worker process
event_bus = EventBus()


# ── Connection configuration ──────────────────────────────────────────────────

@dataclass
class ConnectionConfig:
    topics: list[str] = field(default_factory=list)
    bbox: Optional[dict] = None          # {lat_min, lat_max, lon_min, lon_max}
    mission_id: Optional[str] = None


# ── Connection manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[WebSocket, ConnectionConfig] = {}

    async def connect(
        self,
        websocket: WebSocket,
        topics: list[str],
        bbox: Optional[dict] = None,
        mission_id: Optional[str] = None,
    ) -> None:
        await websocket.accept()
        self._connections[websocket] = ConnectionConfig(
            topics=topics, bbox=bbox, mission_id=mission_id
        )
        logger.info(
            "WS client connected: topics=%s mission_id=%s total=%d",
            topics,
            mission_id,
            len(self._connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)
        logger.info("WS client disconnected — remaining=%d", len(self._connections))

    async def broadcast(self, event: dict) -> None:
        closed: list[WebSocket] = []
        for ws, cfg in self._connections.items():
            if self._matches(event, cfg):
                try:
                    await ws.send_json(event)
                except Exception:
                    closed.append(ws)
        for ws in closed:
            self.disconnect(ws)

    def _matches(self, event: dict, cfg: ConnectionConfig) -> bool:
        event_type = event.get("event", "")
        # Topic filter
        if cfg.topics and event_type not in cfg.topics:
            return False
        # Mission filter
        if cfg.mission_id:
            data_mission = event.get("data", {}).get("mission_id")
            if data_mission and str(data_mission) != cfg.mission_id:
                return False
        return True


connection_manager = ConnectionManager()
