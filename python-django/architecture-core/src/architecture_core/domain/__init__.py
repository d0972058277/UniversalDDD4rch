"""
Domain layer abstractions for Domain-Driven Design.

This module provides the core building blocks for domain modeling:
- AggregateRoot: Root entities with domain event collection
- Entity: Domain entities with identity-based equality
- ValueObject: Immutable value objects with structural equality
- DomainEvent: Domain events for event-driven architecture
"""

from architecture_core.domain.aggregates import AggregateRoot
from architecture_core.domain.entities import Entity
from architecture_core.domain.value_objects import ValueObject
from architecture_core.domain.events import DomainEvent, DomainEventBase
from architecture_core.domain.protocols import EntityId
from architecture_core.domain.repositories import Repository

__all__ = [
    "AggregateRoot",
    "Entity",
    "ValueObject",
    "DomainEvent",
    "DomainEventBase",
    "EntityId",
    "Repository",
]