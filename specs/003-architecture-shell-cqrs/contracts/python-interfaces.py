# Architecture.Shell.Cqrs - Python Interface Contracts
# Language: Python 3.11+
# Purpose: Core CQRS abstractions for mediator pattern implementation
# Dependencies: typing (stdlib), abc (stdlib), asyncio (stdlib)

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Awaitable, Callable, Protocol, runtime_checkable
from dataclasses import dataclass

# Common ancestor for all application-layer requests.
# Enables uniform pipeline processing for commands, queries, and future request types.
class BaseRequest(ABC):
    """Base class for all application-layer requests."""
    pass


# Generic type variables
TResult = TypeVar('TResult')
TRequest = TypeVar('TRequest', bound=BaseRequest)
TResponse = TypeVar('TResponse')


# Requests that return a value.
# Used by queries and commands with return values.
class BaseRequestOf(BaseRequest, Generic[TResult]):
    """Base class for requests that return a value."""
    pass


# Marker class for state-changing operations with no return value.
# Executes within transaction boundary.
class Command(BaseRequest):
    """Base class for commands (state-changing operations with no return value)."""
    pass


# Marker class for state-changing operations with return value.
# Executes within transaction boundary.
class CommandOf(BaseRequestOf[TResult], Generic[TResult]):
    """Base class for commands with return value."""
    pass


# Marker class for read-only operations with return value.
# Executes WITHOUT transaction; may use caching.
class Query(BaseRequestOf[TResult], Generic[TResult]):
    """Base class for queries (read-only operations)."""
    pass


# Cancellation token for async operations
@dataclass
class CancellationToken:
    """Token for cancelling async operations."""
    _cancelled: bool = False

    def is_cancelled(self) -> bool:
        """Check if cancellation has been requested."""
        return self._cancelled

    def cancel(self) -> None:
        """Request cancellation."""
        self._cancelled = True

    def throw_if_cancellation_requested(self) -> None:
        """Raise OperationCancelledError if cancellation requested."""
        if self._cancelled:
            raise OperationCancelledError("Operation was cancelled")


class OperationCancelledError(Exception):
    """Exception raised when operation is cancelled."""
    pass


# Base handler interface for processing requests.
# Business errors return Result.failure(); infrastructure errors raise exceptions.
class RequestHandler(ABC, Generic[TRequest, TResponse]):
    """Base handler interface for processing requests."""

    @abstractmethod
    async def handle(
        self,
        request: TRequest,
        cancellation_token: CancellationToken
    ) -> TResponse:
        """
        Handle the request.
        Business errors: return Result[T].failure()
        Infrastructure errors: raise exception
        """
        pass


# Handler for commands with no return value.
class CommandHandler(RequestHandler[Command, None], ABC):
    """Handler for commands with no return value."""
    pass


# Handler for commands with return value.
class CommandHandlerOf(RequestHandler[CommandOf[TResult], TResult], Generic[TResult], ABC):
    """Handler for commands with return value."""
    pass


# Handler for read-only queries.
class QueryHandler(RequestHandler[Query[TResult], TResult], Generic[TResult], ABC):
    """Handler for read-only queries."""
    pass


# Single entry point for sending commands and queries.
# Routes requests to registered handlers via pipeline behaviors.
class Mediator(ABC):
    """Single entry point for sending commands and queries."""

    @abstractmethod
    async def send(
        self,
        request: BaseRequestOf[TResponse],
        cancellation_token: CancellationToken | None = None
    ) -> TResponse:
        """Send a request with return value through the pipeline."""
        pass

    @abstractmethod
    async def send_command(
        self,
        command: Command,
        cancellation_token: CancellationToken | None = None
    ) -> None:
        """Send a command with no return value through the pipeline."""
        pass


# Delegate representing the next step in the pipeline (next behavior or handler).
RequestHandlerDelegate = Callable[[], Awaitable[TResponse]]


# Pipeline behavior for cross-cutting concerns.
# Wraps handler execution with pre/post logic.
class PipelineBehavior(ABC, Generic[TRequest, TResponse]):
    """Pipeline behavior for cross-cutting concerns."""

    @abstractmethod
    async def handle(
        self,
        request: TRequest,
        next_handler: RequestHandlerDelegate[TResponse],
        cancellation_token: CancellationToken
    ) -> TResponse:
        """
        Handle the request by executing cross-cutting logic before/after calling next.
        """
        pass

    @property
    def order(self) -> int:
        """
        Execution order (lower values execute first).
        Default: 100. Recommended: Validation=10, Authorization=20, Transaction=30, Telemetry=40, Resilience=50
        """
        return 100


# Transaction boundary abstraction for commands.
class UnitOfWork(ABC):
    """Transaction boundary abstraction for commands."""

    @property
    @abstractmethod
    def transaction_id(self) -> str:
        """Unique identifier for the current transaction."""
        pass

    @property
    @abstractmethod
    def has_active_transaction(self) -> bool:
        """Indicates whether a transaction is currently active."""
        pass

    @abstractmethod
    async def begin_transaction(
        self,
        cancellation_token: CancellationToken | None = None
    ) -> None:
        """
        Begin a new transaction.
        Raises exception if transaction provider unavailable (fail fast).
        """
        pass

    @abstractmethod
    async def commit(
        self,
        cancellation_token: CancellationToken | None = None
    ) -> None:
        """
        Commit the current transaction.
        Called on successful handler completion (including Result.failure business errors).
        """
        pass

    @abstractmethod
    async def rollback(
        self,
        cancellation_token: CancellationToken | None = None
    ) -> None:
        """
        Rollback the current transaction.
        Called on exception (infrastructure errors).
        """
        pass


# Configuration interface for determining which behaviors apply to which request types.
@runtime_checkable
class BehaviorMatcher(Protocol):
    """Configuration interface for determining which behaviors apply to which request types."""

    def matches(self, request: BaseRequest) -> bool:
        """Determine if this behavior should execute for the given request type."""
        ...


# Predefined matcher for commands only.
class CommandOnlyMatcher:
    """Matcher that only matches commands."""

    def matches(self, request: BaseRequest) -> bool:
        """Check if request is a command."""
        return isinstance(request, (Command, CommandOf))


# Predefined matcher for queries only.
class QueryOnlyMatcher:
    """Matcher that only matches queries."""

    def matches(self, request: BaseRequest) -> bool:
        """Check if request is a query."""
        return isinstance(request, Query)


# Predefined matcher for all requests.
class AllRequestsMatcher:
    """Matcher that matches all requests."""

    def matches(self, request: BaseRequest) -> bool:
        """Always returns True."""
        return True


# Helper functions for type checking
def is_command(request: BaseRequest) -> bool:
    """Check if a request is a command."""
    return isinstance(request, (Command, CommandOf))


def is_query(request: BaseRequest) -> bool:
    """Check if a request is a query."""
    return isinstance(request, Query)