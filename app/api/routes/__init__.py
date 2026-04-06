from app.api.routes.auth import router as auth_router
from app.api.routes.measurements import (
    instrument_router,
    router as measurements_router,
    type_router,
)
from app.api.routes.visitors import router as visitors_router, tracks_router
from app.api.routes.missions import router as missions_router
from app.api.routes.labels import router as labels_router
from app.api.routes.users import router as users_router
from app.api.routes.aggregation import router as aggregation_router
from app.api.routes.scenarios import router as scenarios_router

__all__ = [
    "auth_router",
    "measurements_router",
    "instrument_router",
    "type_router",
    "visitors_router",
    "tracks_router",
    "missions_router",
    "labels_router",
    "users_router",
    "aggregation_router",
    "scenarios_router",
]
