from services.visitor_service import VisitorService
from services.measurement_service import MeasurementService
from schemas.visitor import VisitorExposureCreate
from schemas.measurement import MeasurementUpdate
from sqlalchemy.ext.asyncio import AsyncSession

def calculate_exposure(db: AssyncSession, scenario_id: str, visitor_id: str):
    """
    Calculate exposure of a visitor given its data.
    
    Args:
        db: assync session to the database
        scenario_id: The scenario identifier
        visitor_id: The visitor identifier
    
    Returns:
        dict: Contains visitor info, measurements, and track data
    """
    svc = VisitorService(db)
    measurements = svc.list_body_measurements(scenario_id, visitor_id)
    # TODO: add the real calculation here!
    return VisitorExposureCreate({"internal_exposure": -1, "external_exposure": -1})

def calculate_field(db: AsyncSession, scenario_id: str, measurement_id: str):
    svc = MeasurementService(db)
    measurement = svc.get_measurement(scenario_id, measurement_id)
    # TODO: add the real calculation here
    calculated_field = -1
    calculated_field_type = "test"
    return MeasurementUpdate(
        **measurement.dict(),
        calculated_field=calculated_field,
        calculated_field_type=calculated_field_type
    )
    




