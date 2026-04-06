"""
Base Repository Pattern - Complete Implementation Guide
========================================================

This document explains the generic BaseRepository pattern and how to use it
throughout the application for flexible, type-safe filtering and CRUD operations.

## What is BaseRepository?

BaseRepository is a generic repository class that provides:
- Type-safe CRUD operations (create, get_by_id, update, delete_by_id)
- Flexible filtering via structured FilterQuery objects
- Automatic scenario isolation (scenario_id filtering)
- Field type validation to prevent invalid filters

## Files Involved

- app/repositories/base.py - BaseRepository generic class
- app/repositories/field_registry.py - FieldValidator for type checking
- app/schemas/filter.py - FilterQuery, FilterCondition, FilterOperator schemas
- app/services/*.py - Updated services with search methods
- app/api/routes/*.py - Updated routes with /search endpoints

## Key Components

### 1. FilterOperator Enum
Supported operators:
- eq, ne - equality comparisons
- gt, gte, lt, lte - numeric/datetime comparisons
- in, nin - list membership
- contains, startswith - string operations
- between - numeric/datetime range
- isnull - null checks

### 2. FilterCondition
Single filter condition:
```python
{
    "field": "value",        # Field name on the model
    "op": "gte",             # Operator (from FilterOperator)
    "value": 50.5            # Value to filter by
}
```

### 3. FilterQuery
Complete filter request:
```python
{
    "filters": [
        {"field": "team", "op": "eq", "value": "alpha"},
        {"field": "value", "op": "gte", "value": 50}
    ],
    "logic": "and",          # Combine filters with AND or OR
    "skip": 0,               # Pagination offset
    "limit": 20              # Pagination limit
}
```

## Usage Examples

### Example 1: Search Measurements

CLI:
```bash
curl -X POST http://localhost:8000/api/v1/drill/measurements/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"field": "value", "op": "gte", "value": 50},
      {"field": "unit", "op": "eq", "value": "celsius"}
    ],
    "logic": "and",
    "skip": 0,
    "limit": 20
  }'
```

Python/Service Layer:
```python
from app.schemas.filter import FilterQuery, FilterCondition, FilterOperator
from app.services.measurement_service import MeasurementService

filter_query = FilterQuery(
    filters=[
        FilterCondition(field="value", op=FilterOperator.GTE, value=50),
        FilterCondition(field="unit", op=FilterOperator.EQ, value="celsius"),
    ],
    logic="and",
    skip=0,
    limit=20
)

svc = MeasurementService(db)
results = await svc.search_measurements(scenario_id, filter_query)
```

### Example 2: Search by Multiple Values

Find measurements from multiple teams:
```bash
curl -X POST http://localhost:8000/api/v1/drill/measurements/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"field": "team", "op": "in", "value": ["alpha", "bravo", "charlie"]}
    ],
    "skip": 0,
    "limit": 50
  }'
```

### Example 3: Complex Filter (AND/OR logic)

Find measurements from time range OR with specific value:
```bash
curl -X POST http://localhost:8000/api/v1/drill/measurements/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"field": "timestamp", "op": "gte", "value": "2026-01-01T00:00:00Z"},
      {"field": "value", "op": "lt", "value": 10}
    ],
    "logic": "or",
    "skip": 0,
    "limit": 50
  }'
```

### Example 4: Range Queries

Find temperatures between 15 and 25 degrees:
```bash
curl -X POST http://localhost:8000/api/v1/drill/measurements/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"field": "value", "op": "between", "value": [15, 25]}
    ],
    "skip": 0,
    "limit": 50
  }'
```

### Example 5: NULL Checks

Find measurements with missing location:
```bash
curl -X POST http://localhost:8000/api/v1/drill/measurements/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"field": "location", "op": "isnull", "value": true}
    ],
    "skip": 0,
    "limit": 50
  }'
```

## Using BaseRepository Directly in Code

### Basic CRUD

```python
from app.repositories.base import BaseRepository
from app.models.measurement import Measurement

repo = BaseRepository(Measurement, db)

# Get by ID
measurement = await repo.get_by_id(measurement_id, scenario_id=scenario_id)

# Create
measurement = await repo.create({"scenario_id": scenario_id, "value": 42, ...})
await db.commit()  # Don't forget to commit!

# Update
updated = await repo.update(measurement_id, {"value": 43})
await db.commit()

# Delete
deleted = await repo.delete_by_id(measurement_id)
await db.commit()

# List all
items = await repo.get_all(scenario_id=scenario_id, skip=0, limit=20)

# Count
total = await repo.count(scenario_id=scenario_id)
```

### Filtering with FilterQuery

```python
from app.schemas.filter import FilterQuery, FilterCondition, FilterOperator
from app.repositories.base import BaseRepository
from app.models.measurement import Measurement

repo = BaseRepository(Measurement, db)

filter_query = FilterQuery(
    filters=[
        FilterCondition(field="value", op=FilterOperator.GTE, value=50),
    ],
    skip=0,
    limit=20
)

results = await repo.filter_by(filter_query, scenario_id=scenario_id)
```

## Adding Search to New Routes

When adding a /search endpoint:

1. Import FilterQuery in your route:
```python
from app.schemas.filter import FilterQuery
```

2. Create the route handler:
```python
@router.post("/search", response_model=list[MyResponse])
async def search_items(
    body: FilterQuery,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> list[MyResponse]:
    svc = MyService(db)
    items = await svc.search_items(scenario.id, body)
    return [MyResponse.model_validate(m) for m in items]
```

3. Add search method to service:
```python
async def search_items(
    self,
    scenario_id: uuid.UUID,
    filter_query: FilterQuery,
) -> list[MyModel]:
    """Search items using structured filters."""
    repo = BaseRepository(MyModel, self.db)
    try:
        results = await repo.filter_by(filter_query, scenario_id=scenario_id)
    except ValueError as e:
        raise NotFoundException(f"Invalid filter: {str(e)}")
    return list(results)
```

## Error Handling

FilterQuery validates:
- Field names exist on the model
- Operations are valid for field types (e.g., "contains" only for strings)
- Values match expected types (e.g., "in" requires list)
- Pagination values are reasonable (max 10000 limit)

Invalid filters raise ValueError:
```python
try:
    results = await repo.filter_by(filter_query, scenario_id=scenario_id)
except ValueError as e:
    # Handle invalid filter: "Field 'invalid_name' not found"
    # or "Operator 'gte' requires numeric or datetime field, got string"
    raise HTTPException(status_code=400, detail=str(e))
```

## Supported Field Types

FieldValidator recognizes:
- `string`: String, Text columns
- `numeric`: Integer, Float columns  
- `boolean`: Boolean columns
- `datetime`: DateTime, Date, Time columns
- `geometry`: PostGIS Geography columns
- `json`: JSONB, JSON columns
- `unknown`: Unsupported types (raises error)

Type validation rules:
- `gt, gte, lt, lte, between`: numeric or datetime only
- `contains, startswith`: string only
- `in, nin`: any type (but must pass list value)
- `isnull`: any type (but must pass bool value)

## Comparison with Previous Approach

Before (MeasurementFilterParams):
```python
filters = MeasurementFilterParams(
    from_date=from_date,
    to_date=to_date,
    lat_min=lat_min,
    lat_max=lat_max,
    lon_min=lon_min,
    lon_max=lon_max,
)
items, total = await repo.get_filtered(scenario_id, filters, skip, limit)
```

Now (FilterQuery):
```python
filter_query = FilterQuery(
    filters=[
        FilterCondition(field="timestamp", op="gte", value=from_date),
        FilterCondition(field="timestamp", op="lte", value=to_date),
    ]
)
items = await repo.filter_by(filter_query, scenario_id)
```

Benefits:
- ✅ Single, consistent API across all models
- ✅ Type validation prevents invalid filters
- ✅ Extensible (add new operators without API changes)
- ✅ Declarative (filter intent is clear from JSON)
- ✅ Works with existing repositories

## Roadmap

Current implementation:
- ✅ BaseRepository with generic CRUD
- ✅ FilterQuery with type validation
- ✅ Search endpoints for Measurements, Visitors, Missions
- ✅ Service methods for searching

Future enhancements:
- Sorting parameters in FilterQuery
- Geospatial operators (within_bbox, etc.)
- Aggregation filters
- Advanced relationship filtering
"""
