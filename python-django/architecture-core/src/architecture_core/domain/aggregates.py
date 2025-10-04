"""
AggregateRoot base class for domain aggregates with event collection.

This module provides the base class for aggregate roots that manage
domain events and implement optimistic concurrency control.
"""

from typing import TypeVar, List, Generic
from threading import Lock
from architecture_core.domain.entities import Entity
from architecture_core.domain.events import DomainEvent
from architecture_core.domain.protocols import EntityId

TId = TypeVar('TId', bound=EntityId)


class AggregateRoot(Entity[TId], Generic[TId]):
    """
    Base class for domain aggregates with event sourcing and version control.

    Aggregate roots are the only entities that can be directly accessed
    from outside the aggregate boundary. They maintain consistency
    boundaries, collect domain events, and implement optimistic
    concurrency control through versioning.

    This class extends Entity to provide aggregate-specific functionality:
    - Domain event collection and management
    - Optimistic concurrency control via versioning
    - Thread-safe event operations
    - Aggregate lifecycle management

    Examples:
        class Order(AggregateRoot[OrderId]):
            def __init__(self, id: OrderId, customer_id: CustomerId):
                super().__init__(id)
                self._customer_id = customer_id
                self._items = []
                self._status = OrderStatus.DRAFT

                # Add domain event
                self.add_event(OrderCreated(
                    order_id=id,
                    customer_id=customer_id,
                    occurred_at=datetime.utcnow()
                ))

            def add_item(self, product_id: ProductId, quantity: int) -> Result[None]:
                if self._status != OrderStatus.DRAFT:
                    return Result.failure(Error.domain(
                        "Order.CannotModify",
                        "Cannot modify confirmed order"
                    ))

                self._items.append(OrderItem(product_id, quantity))
                self.add_event(OrderItemAdded(
                    order_id=self.id,
                    product_id=product_id,
                    quantity=quantity
                ))
                return Result.success(None)

    Design Principles:
        1. Consistency Boundary: Aggregates enforce business invariants
        2. Event Sourcing: All state changes produce domain events
        3. Optimistic Concurrency: Version control prevents lost updates
        4. Transactional Boundary: Aggregates define transaction scope
    """

    def __init__(self, id: TId, version: int = 0) -> None:
        """
        Initialize aggregate with identifier and version.

        Args:
            id: The aggregate identifier (cannot be None)
            version: Initial version for optimistic concurrency control

        Raises:
            ValueError: If id is None or version is negative
        """
        super().__init__(id)

        if version < 0:
            raise ValueError("Aggregate version cannot be negative")

        self._version = version
        self._domain_events: List[DomainEvent] = []
        self._event_lock = Lock()

    @property
    def version(self) -> int:
        """
        Get the current version for optimistic concurrency control.

        The version is incremented each time the aggregate is persisted
        and is used to detect concurrent modifications.

        Returns:
            Current aggregate version
        """
        return self._version

    @property
    def domain_events(self) -> List[DomainEvent]:
        """
        Get read-only collection of domain events.

        Domain events represent significant business occurrences that
        domain experts care about. This collection contains all events
        that have been added since the last clear operation.

        Returns:
            Read-only list of domain events
        """
        with self._event_lock:
            # Return a copy to ensure immutability
            return list(self._domain_events)

    def add_event(self, event: DomainEvent) -> None:
        """
        Add domain event to the aggregate.

        Events are collected in the order they are added and can be
        processed by infrastructure components for event publishing,
        logging, or other cross-cutting concerns.

        Args:
            event: The domain event to add (cannot be None)

        Raises:
            ValueError: If event is None
            TypeError: If event does not implement DomainEvent protocol
        """
        if event is None:
            raise ValueError("Domain event cannot be None")

        # Runtime check for DomainEvent protocol compliance
        required_attrs = ['id', 'occurred_at', 'correlation_id', 'causation_id']
        if not all(hasattr(event, attr) for attr in required_attrs):
            raise TypeError(f"Event must implement DomainEvent protocol, got {type(event)}")

        with self._event_lock:
            self._domain_events.append(event)

    def clear_events(self) -> None:
        """
        Clear all domain events from the aggregate.

        This method is typically called by the repository after
        successfully persisting the aggregate and publishing events.
        """
        with self._event_lock:
            self._domain_events.clear()

    def increment_version(self) -> None:
        """
        Increment version for optimistic concurrency control.

        This method is typically called by the repository when
        persisting the aggregate to track modifications.
        """
        self._version += 1

    def _mark_version(self, version: int) -> None:
        """
        Set version directly (for repository use only).

        This method allows repositories to set the version when
        loading aggregates from persistence without triggering
        increment behavior.

        Args:
            version: The version to set

        Raises:
            ValueError: If version is negative
        """
        if version < 0:
            raise ValueError("Aggregate version cannot be negative")
        self._version = version

    def __str__(self) -> str:
        """
        String representation showing type, ID, and version.

        Returns:
            Human-readable string representation
        """
        return f"{self.__class__.__name__}(id={self.id}, version={self.version})"

    def __repr__(self) -> str:
        """
        Detailed string representation for debugging.

        Returns:
            Detailed string representation including event count
        """
        event_count = len(self.domain_events)
        return f"{self.__class__.__name__}(id={self.id}, version={self.version}, events={event_count})"