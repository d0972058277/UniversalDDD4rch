"""Mediator implementation for routing commands and queries."""

from typing import Any, TypeVar, Generic, Dict, Type, List
from architecture_core.functional import Result, Error

TRequest = TypeVar("TRequest")
TResponse = TypeVar("TResponse")


class Mediator:
    """
    Mediator for routing commands and queries to their handlers.

    Supports pipeline behaviors for cross-cutting concerns.
    """

    def __init__(self) -> None:
        """Initialize the mediator."""
        self._handlers: Dict[Type[Any], Any] = {}
        self._behaviors: List[Any] = []

    def register_handler(
        self,
        request_type: Type[TRequest],
        handler: Any
    ) -> None:
        """
        Register a handler for a request type.

        Args:
            request_type: The type of request to handle
            handler: The handler instance
        """
        self._handlers[request_type] = handler

    def register_behavior(self, behavior: Any) -> None:
        """
        Register a pipeline behavior.

        Args:
            behavior: The behavior to add to the pipeline
        """
        self._behaviors.append(behavior)

    async def send(self, request: TRequest) -> Result[TResponse]:
        """
        Send a request through the mediator pipeline.

        Args:
            request: The command or query to process

        Returns:
            Result containing the response or error
        """
        request_type = type(request)

        if request_type not in self._handlers:
            return Result.failure(
                Error.infrastructure(
                    "Mediator.HandlerNotFound",
                    f"No handler registered for {request_type.__name__}"
                )
            )

        handler = self._handlers[request_type]

        # TODO: Implement pipeline behavior execution
        # For now, directly invoke the handler
        return await handler.handle(request)
