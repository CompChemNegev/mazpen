from __future__ import annotations

import asyncio
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser
from app.schemas.geocoding import GeocodingSuggestion

router = APIRouter(prefix="/geocoding", tags=["Geocoding"])


def _search_places(query: str, limit: int) -> list[GeocodingSuggestion]:
    params = urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": str(limit),
            "accept-language": "he,en",
            "addressdetails": "0",
        }
    )
    request = Request(
        f"https://nominatim.openstreetmap.org/search?{params}",
        headers={
            "User-Agent": "MAZPEN/1.0 (visitor geocoding)",
        },
    )
    with urlopen(request, timeout=5) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return [
        GeocodingSuggestion(
            display_name=item["display_name"],
            lat=float(item["lat"]),
            lon=float(item["lon"]),
        )
        for item in payload
    ]


@router.get("/search", response_model=list[GeocodingSuggestion])
async def search_places(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=5, ge=1, le=10),
    _: CurrentUser = None,
) -> list[GeocodingSuggestion]:
    return await asyncio.to_thread(_search_places, q, limit)
