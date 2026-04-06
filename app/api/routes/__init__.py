from app.api.routes.auth import router as auth_router
from app.api.routes.measurements import router as measurements_router
from app.api.routes.visitors import router as visitors_router, tracks_router
from app.api.routes.missions import router as missions_router
from app.api.routes.teams import router as teams_router
from app.api.routes.users import router as users_router
from app.api.routes.scenarios import router as scenarios_router
from app.api.routes.configured_values import router as configured_values_router

__all__ = [
    "auth_router",
    "measurements_router",
    "visitors_router",
    "tracks_router",
    "missions_router",
    "teams_router",
    "users_router",
    "scenarios_router",
    "configured_values_router",
]
