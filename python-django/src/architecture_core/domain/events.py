"""
Domain event definitions and base implementations.

This module provides the core domain event infrastructure including
the DomainEvent protocol and DomainEventBase implementation.
"""

import uuid
from typing import Protocol, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field


class DomainEvent(Protocol):
    """
    Protocol for domain events that represent significant business occurrences.

    Domain events are immutable records of something that happened in the domain
    that domain experts care about. They support correlation and causation tracking
    for event-driven architectures.
    """

    @property
    def id(self) -> str:
        """Unique identifier for the event"""
        ...

    @property
    def occurred_at(self) -> datetime:
        """When the event occurred"""
        ...

    @property
    def correlation_id(self) -> Optional[str]:
        """Correlation ID for event tracking across boundaries"""
        ...

    @property
    def causation_id(self) -> Optional[str]:
        """Causation ID linking to the event that caused this event"""
        ...


@dataclass(frozen=True)
class DomainEventBase:
    """
    Base implementation for domain events with automatic ID generation and timestamping.

    This immutable dataclass provides standard event metadata and can be extended
    by specific domain events to add business-specific data.

    Examples:
        @dataclass(frozen=True)
        class OrderCreated(DomainEventBase):
            order_id: str
            customer_id: str
            total_amount: Money

        # Create event with automatic timestamp
        event = OrderCreated(order_id="123", customer_id="456", total_amount=money)

        # Create event with correlation tracking
        event = OrderCreated(
            order_id="123",
            customer_id="456",
            total_amount=money,
            correlation_id="correlation-123",
            causation_id="causation-456"
        )
    """

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None

    def __post_init__(self) -> None:
        """Validate event data after initialization"""
        if not self.id:
            raise ValueError("Event ID cannot be empty")

        if not self.occurred_at:
            raise ValueError("Event occurrence time cannot be empty")

        if self.occurred_at.tzinfo is None:
            raise ValueError("Event occurrence time must include timezone information")