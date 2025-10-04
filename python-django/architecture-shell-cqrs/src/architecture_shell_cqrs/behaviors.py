"""Pipeline behavior interfaces for cross-cutting concerns."""

from abc import ABC, abstractmethod
from typing import Callable, Generic, TypeVar, Awaitable
from architecture_core.functional import Result

TRequest = TypeVar("TRequest")
TResponse = TypeVar("TResponse")

RequestHandlerDelegate = Callable[[], Awaitable[Result[TResponse]]]


class IPipelineBehavior(ABC, Generic[TRequest, TResponse]):
    """
    Pipeline behavior for intercepting requests.

    Behaviors are executed in registration order around the handler execution.
    """

    @abstractmethod
    async def handle(
        self,
        request: TRequest,
        next_handler: RequestHandlerDelegate[TResponse]
    ) -> Result[TResponse]:
        """
        Process the request and optionally call the next behavior in the pipeline.

        Args:
            request: The request being processed
            next_handler: Delegate to invoke the next behavior or handler

        Returns:
            Result containing the response or error
        """
        pass
