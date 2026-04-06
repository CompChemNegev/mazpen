"""Generic filter query schema for type-safe filtering across all models."""

from typing import Any, Literal, Union
from pydantic import BaseModel, field_validator
from enum import Enum


class FilterOperator(str, Enum):
    """All supported filter operators."""
    EQ = "eq"              # equals
    NE = "ne"              # not equals
    GT = "gt"              # greater than
    GTE = "gte"            # greater than or equal
    LT = "lt"              # less than
    LTE = "lte"            # less than or equal
    IN = "in"              # in list
    NIN = "nin"            # not in list
    CONTAINS = "contains"  # string contains (case-insensitive)
    STARTSWITH = "startswith"  # string starts with
    BETWEEN = "between"    # value between two numbers/dates
    ISNULL = "isnull"      # is null / is not null


class FilterCondition(BaseModel):
    """Single filter condition."""
    field: str
    op: FilterOperator
    value: Union[str, int, float, bool, list[Any], None] = None
    
    @field_validator("field")
    @classmethod
    def validate_field_not_empty(cls, v):
        """Prevent empty field names (injection risk)."""
        if isinstance(v, str) and not v.strip():
            raise ValueError("Field name cannot be empty")
        return v
    
    def __repr__(self):
        return f"FilterCondition(field={self.field}, op={self.op.value}, value={self.value})"


class FilterQuery(BaseModel):
    """Entire filter request."""
    filters: list[FilterCondition] = []
    logic: Literal["and", "or"] = "and"
    skip: int = 0
    limit: int = 50
    
    @field_validator("skip", "limit")
    @classmethod
    def validate_pagination(cls, v):
        if v < 0:
            raise ValueError("Pagination values must be non-negative")
        if v > 10000:  # Prevent DoS
            raise ValueError("Limit cannot exceed 10000")
        return v
    
    @field_validator("limit")
    @classmethod
    def validate_limit_min(cls, v):
        if v < 1:
            raise ValueError("Limit must be at least 1")
        return v
