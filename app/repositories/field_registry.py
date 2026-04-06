"""Field metadata and validation for type-safe filtering."""

from typing import Type, Any
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.sql.sqltypes import (
    String, Integer, Float, Boolean, DateTime, Date, Time, 
    ARRAY, JSON, JSONB
)


class FieldValidator:
    """Validates filter operations against field types."""
    
    NUMERIC_OPS = {"gt", "gte", "lt", "lte", "between"}
    STRING_OPS = {"contains", "startswith"}
    LIST_OPS = {"in", "nin"}
    
    @staticmethod
    def get_column_type(model: Type, field_name: str) -> str:
        """
        Get SQLAlchemy column type category for a field.
        
        Returns one of: 'string', 'numeric', 'boolean', 'datetime', 'geometry', 'unknown'
        """
        try:
            mapper = sa_inspect(model)
            
            # Check if field exists
            if field_name not in mapper.columns:
                return "unknown"
            
            column = mapper.columns[field_name]
            
            # Map SQLAlchemy types to categories
            if isinstance(column.type, String):
                return "string"
            elif isinstance(column.type, (Integer, Float)):
                return "numeric"
            elif isinstance(column.type, Boolean):
                return "boolean"
            elif isinstance(column.type, (DateTime, Date, Time)):
                return "datetime"
            elif hasattr(column.type, 'name') and 'geometry' in column.type.name.lower():
                return "geometry"
            elif isinstance(column.type, (ARRAY, JSON, JSONB)):
                return "json"
            else:
                return "unknown"
        except (AttributeError, KeyError, TypeError):
            return "unknown"
    
    @staticmethod
    def validate_operation(
        model: Type, 
        field_name: str, 
        operator: str, 
        value: Any
    ) -> None:
        """
        Validate that a filter operation is legal for the field type.
        
        Raises ValueError if operation is invalid.
        """
        field_type = FieldValidator.get_column_type(model, field_name)
        
        if field_type == "unknown":
            raise ValueError(f"Field '{field_name}' not found or unsupported type on {model.__name__}")
        
        # Numeric operators require numeric or datetime fields
        if operator in FieldValidator.NUMERIC_OPS:
            if field_type not in ["numeric", "datetime"]:
                raise ValueError(
                    f"Operator '{operator}' requires numeric or datetime field, "
                    f"got {field_type} on field '{field_name}'"
                )
        
        # String operators require string fields
        if operator in FieldValidator.STRING_OPS:
            if field_type != "string":
                raise ValueError(
                    f"Operator '{operator}' requires string field, "
                    f"got {field_type} on field '{field_name}'"
                )
        
        # In/nin operators require list values
        if operator in FieldValidator.LIST_OPS:
            if not isinstance(value, list):
                raise ValueError(
                    f"Operator '{operator}' requires list value, "
                    f"got {type(value).__name__}"
                )
        
        # Between requires [min, max] pair
        if operator == "between":
            if not isinstance(value, list) or len(value) != 2:
                raise ValueError(
                    f"Operator 'between' requires [min, max] list, got {value}"
                )
        
        # Isnull requires boolean value
        if operator == "isnull":
            if not isinstance(value, bool):
                raise ValueError(
                    f"Operator 'isnull' requires boolean value, got {type(value).__name__}"
                )
