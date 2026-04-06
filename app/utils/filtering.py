from __future__ import annotations

from typing import Any

from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping, shape


def wkb_to_geojson(geom: Any) -> dict | None:
    """Convert a GeoAlchemy2 WKBElement to a GeoJSON dict."""
    if geom is None:
        return None
    return dict(mapping(to_shape(geom)))


def geojson_to_wkb(geojson: dict) -> Any:
    """Convert a GeoJSON dict to a GeoAlchemy2 WKBElement (SRID=4326)."""
    return from_shape(shape(geojson), srid=4326)


def build_bbox_filter(
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
) -> Any:
    """Return a PostGIS ST_MakeEnvelope expression for bbox filtering."""
    from sqlalchemy import func

    return func.ST_MakeEnvelope(lon_min, lat_min, lon_max, lat_max, 4326)
