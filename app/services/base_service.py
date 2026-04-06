from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseService(ABC):
    """Common service contract for event payload serialization coherence."""

    @abstractmethod
    def serialize_for_event(self, obj: Any) -> dict[str, Any]:
        """Serialize domain objects into event payloads."""
        raise NotImplementedError
