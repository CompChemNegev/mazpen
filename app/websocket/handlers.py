from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from app.websocket.connection_manager import connection_manager, event_bus

logger = logging.getLogger(__name__)


async def websocket_stream_handler(
    websocket: WebSocket,
    topics: Optional[str] = None,
    bbox: Optional[str] = None,
    mission_id: Optional[str] = None,
) -> None:
    """
    Main WebSocket handler.

    Query params:
    - topics: comma-separated list, e.g. "measurement.created,label.assigned"
    - bbox: "lat_min,lat_max,lon_min,lon_max"
    - mission_id: UUID string
    """
    topic_list = [t.strip() for t in topics.split(",")] if topics else []
    bbox_dict: dict | None = None
    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                bbox_dict = {
                    "lat_min": parts[0],
                    "lat_max": parts[1],
                    "lon_min": parts[2],
                    "lon_max": parts[3],
                }
        except ValueError:
            logger.warning("Invalid bbox param: %s", bbox)

    await connection_manager.connect(
        websocket,
        topics=topic_list,
        bbox=bbox_dict,
        mission_id=mission_id,
    )

    queue = event_bus.subscribe()

    # Send handshake acknowledgement
    await websocket.send_json(
        {
            "event": "connection.established",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "subscribed_topics": topic_list or ["*"],
                "mission_id": mission_id,
                "bbox": bbox_dict,
            },
        }
    )

    try:
        # Concurrently listen for events from the bus and client pings
        async def relay_events() -> None:
            while True:
                event = await queue.get()
                await connection_manager.broadcast(event)

        async def receive_pings() -> None:
            while True:
                try:
                    msg = await websocket.receive_text()
                    if msg == "ping":
                        await websocket.send_text("pong")
                except WebSocketDisconnect:
                    break

        relay_task = asyncio.create_task(relay_events())
        ping_task = asyncio.create_task(receive_pings())

        done, pending = await asyncio.wait(
            {relay_task, ping_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected gracefully")
    except Exception as exc:
        logger.exception("WebSocket error: %s", exc)
    finally:
        event_bus.unsubscribe(queue)
        connection_manager.disconnect(websocket)
