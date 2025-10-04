"""
Domain layer protocols for type definitions.

This module defines the core protocols that establish contracts for domain types.
All domain implementations must conform to these protocols.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class EntityId(Protocol):
    """
    Protocol defining contract for entity identifiers.

    Entity IDs must provide string representation, equality comparison,
    and hash computation for use in collections.
    """

    def __str__(self) -> str:
        """String representation of the ID"""
        ...

    def __eq__(self, other: object) -> bool:
        """Equality comparison with other objects"""
        ...

    def __hash__(self) -> int:
        """Hash code for use in collections"""
        ...