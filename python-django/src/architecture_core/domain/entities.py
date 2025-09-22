"""
Entity base class for identity-based equality.

This module provides the base class for domain entities that implement
identity-based equality using strongly-typed entity identifiers.
"""

from typing import TypeVar, Generic
from abc import ABC
from architecture_core.domain.protocols import EntityId

TId = TypeVar('TId', bound=EntityId)


class Entity(Generic[TId], ABC):
    """
    Abstract base class for domain entities with identity-based equality.

    Entities are objects with a distinct identity that runs through time
    and often across distinct representations. Unlike value objects,
    entities are identified by their ID rather than their attributes.

    This generic base class ensures type safety by constraining the ID
    type to implement the EntityId protocol, enabling compile-time
    verification of ID types throughout the domain model.

    Examples:
        @dataclass(frozen=True)
        class CustomerId:
            value: str
            def __str__(self) -> str: return self.value
            def __eq__(self, other: object) -> bool: ...
            def __hash__(self) -> int: ...

        class Customer(Entity[CustomerId]):
            def __init__(self, id: CustomerId, name: str, email: str):
                super().__init__(id)
                self.name = name
                self.email = email

    Design Principles:
        1. Identity-based Equality: Entities are equal if they have the same ID
        2. Type Safety: Generic ID types prevent ID mixups at compile time
        3. Immutable Identity: Entity ID should not change after creation
        4. Lifecycle Management: Entities can change state while maintaining identity
    """

    def __init__(self, id: TId) -> None:
        """
        Initialize entity with identifier.

        Args:
            id: The entity identifier (cannot be None)

        Raises:
            ValueError: If id is None
            TypeError: If id does not implement EntityId protocol
        """
        if id is None:
            raise ValueError("Entity ID cannot be None")

        # Type check at runtime to ensure EntityId protocol compliance
        if not hasattr(id, '__str__') or not hasattr(id, '__eq__') or not hasattr(id, '__hash__'):
            raise TypeError(f"Entity ID must implement EntityId protocol, got {type(id)}")

        self._id = id

    @property
    def id(self) -> TId:
        """
        Get the immutable entity identifier.

        Returns:
            The entity identifier
        """
        return self._id

    def __eq__(self, other: object) -> bool:
        """
        Identity-based equality comparison.

        Entities are equal if they are both Entity instances with
        equal identifiers. Other attributes do not affect equality.

        Args:
            other: Object to compare with

        Returns:
            True if both are entities with same ID, False otherwise
        """
        if self is other:
            return True

        if other is None:
            return False

        if not isinstance(other, Entity):
            return False

        # Entities must be of the same concrete type and have same ID
        # Different entity types should not be equal even with same ID
        if type(self) != type(other):
            return False

        return self.id == other.id

    def __hash__(self) -> int:
        """
        Hash code based on entity identifier.

        The hash is computed from the entity ID to ensure that
        equal entities have equal hash codes.

        Returns:
            Hash code for the entity
        """
        return hash(self.id)

    def __str__(self) -> str:
        """
        String representation showing type and ID.

        Returns:
            Human-readable string representation
        """
        return f"{self.__class__.__name__}(id={self.id})"

    def __repr__(self) -> str:
        """
        Detailed string representation for debugging.

        Returns:
            Detailed string representation
        """
        return self.__str__()