"""Request interfaces for CQRS pattern."""

from typing import Protocol, TypeVar, runtime_checkable
from architecture_core.functional import Result

TResponse = TypeVar("TResponse", covariant=True)


@runtime_checkable
class IRequest(Protocol[TResponse]):
    """Base interface for all requests (commands and queries)."""
    pass


@runtime_checkable
class ICommand(Protocol[TResponse]):
    """Marker interface for commands that modify state."""
    pass


@runtime_checkable
class IQuery(Protocol[TResponse]):
    """Marker interface for queries that read state."""
    pass
