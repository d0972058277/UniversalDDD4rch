"""Handler interfaces for commands and queries."""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar
from architecture_core.functional import Result

TCommand = TypeVar("TCommand")
TQuery = TypeVar("TQuery")
TResponse = TypeVar("TResponse")


class ICommandHandler(ABC, Generic[TCommand, TResponse]):
    """Handler interface for commands."""

    @abstractmethod
    async def handle(self, command: TCommand) -> Result[TResponse]:
        """Handle a command and return a result."""
        pass


class IQueryHandler(ABC, Generic[TQuery, TResponse]):
    """Handler interface for queries."""

    @abstractmethod
    async def handle(self, query: TQuery) -> Result[TResponse]:
        """Handle a query and return a result."""
        pass
