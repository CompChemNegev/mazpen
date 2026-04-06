"""
Example API interactions for the Environmental Monitoring API.

Prerequisites:
  - Docker: docker compose up -d
  - or locally: pip install -r requirements.txt && uvicorn app.main:app --reload

Base URL: http://localhost:8000/api/v1
"""

import asyncio
import json
import websockets
import httpx

BASE = "http://localhost:8000/api/v1"


async def demo() -> None:
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as client:

        # ── 1. Register a user ─────────────────────────────────────────────
        r = await client.post("/users", json={
            "name": "Alice Admin",
            "email": "alice@example.com",
            "role": "admin",
            "password": "SuperSecret123",
        })
        print("Create user:", r.status_code, r.json())

        # ── 2. Obtain JWT token ────────────────────────────────────────────
        r = await client.post("/auth/token", data={
            "username": "alice@example.com",
            "password": "SuperSecret123",
        })
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Token obtained ✓")

        # ── 3. Create a measurement type ───────────────────────────────────
        r = await client.post("/measurement-types", json={
            "name": "CO2",
            "unit": "ppm",
        }, headers=headers)
        mt = r.json()
        print("Measurement type:", mt)

        # ── 4. Create an instrument ────────────────────────────────────────
        r = await client.post("/instruments", json={
            "name": "Sensor-Alpha",
            "type": "gas_detector",
            "calibration_date": "2026-01-01T00:00:00Z",
        }, headers=headers)
        instrument = r.json()
        print("Instrument:", instrument)

        # ── 5. Create a mission ────────────────────────────────────────────
        r = await client.post("/missions", json={
            "name": "Urban Air Quality Survey",
            "description": "Q2 CO2 monitoring in city centre",
            "status": "active",
            "target_area": {
                "type": "Polygon",
                "coordinates": [[
                    [34.7, 31.9], [34.85, 31.9],
                    [34.85, 32.1], [34.7, 32.1], [34.7, 31.9],
                ]],
            },
        }, headers=headers)
        mission = r.json()
        print("Mission:", mission)

        # ── 6. Post a measurement ──────────────────────────────────────────
        r = await client.post("/measurements", json={
            "timestamp": "2026-04-05T12:00:00Z",
            "location": {"type": "Point", "coordinates": [34.78, 31.96]},
            "measurement_type_id": mt["id"],
            "value": 412.5,
            "unit": "ppm",
            "instrument_id": instrument["id"],
            "mission_id": mission["id"],
            "metadata": {"weather": "clear", "wind_speed_ms": 3.2},
        }, headers=headers)
        measurement = r.json()
        print("Measurement:", measurement)

        # ── 7. Create a label and assign it ───────────────────────────────
        r = await client.post("/labels", json={"name": "anomaly", "description": "Unusual spike"}, headers=headers)
        label = r.json()
        r = await client.post(
            f"/measurements/{measurement['id']}/labels",
            json={"label_id": label["id"], "reason": "Value > 2σ baseline"},
            headers=headers,
        )
        print("Label assigned:", r.json())

        # ── 8. Spatial filter measurements ────────────────────────────────
        r = await client.get(
            "/measurements",
            params={
                "lat_min": 31.9, "lat_max": 32.1,
                "lon_min": 34.7, "lon_max": 34.85,
                "limit": 10,
            },
            headers=headers,
        )
        print("Filtered measurements:", r.json()["total"], "total")

        # ── 9. Aggregation ─────────────────────────────────────────────────
        r = await client.get("/aggregation/measurements/aggregate", headers=headers)
        print("Aggregations:", r.json())

        # ── 10. Map data ───────────────────────────────────────────────────
        r = await client.get("/aggregation/map-data", headers=headers)
        print("Map features:", r.json()["count"])

    # ── 11. WebSocket streaming ────────────────────────────────────────────
    ws_url = f"ws://localhost:8000/stream?topics=measurement.created,label.assigned"
    print("\nConnecting to WebSocket:", ws_url)
    async with websockets.connect(ws_url) as ws:
        ack = await ws.recv()
        print("WS handshake:", json.loads(ack))
        # (new measurements created in background would arrive here)
        print("WebSocket streaming ready ✓")


if __name__ == "__main__":
    asyncio.run(demo())
