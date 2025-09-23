"""
Repository interface definitions for aggregate persistence.

This module defines the generic repository pattern for aggregate roots
with async operations and Result-based error handling.
"""

from typing import TypeVar, Generic, Protocol
from architecture_core.functional import Result, Maybe
from architecture_core.domain.protocols import EntityId

# Forward reference for circular import resolution
TAggregate = TypeVar('TAggregate', bound='AggregateRoot')
TId = TypeVar('TId', bound=EntityId)


class Repository(Protocol, Generic[TAggregate, TId]):
    """
    Generic repository interface for aggregate persistence with async operations.

    Repositories provide data access for aggregate roots using Result types
    for error handling and Maybe types for optional values. All operations
    are async to support modern I/O patterns.

    Type Parameters:
        TAggregate: The aggregate root type (must extend AggregateRoot)
        TId: The entity identifier type (must implement EntityId protocol)

    Examples:
        class OrderRepository(Repository[Order, OrderId]):
            async def get_by_id_async(self, id: OrderId) -> Maybe[Order]:
                # Implementation here
                pass

        # Usage
        repository = OrderRepository()
        order = await repository.get_by_id_async(OrderId("123"))
        if order.has_value:
            print(f"Found order: {order.value.id}")
    """

    async def get_by_id_async(self, id: TId) -> Maybe[TAggregate]:
        """
        Retrieve aggregate by ID asynchronously.

        Args:
            id: The aggregate identifier

        Returns:
            Maybe containing the aggregate if found, None otherwise
        """
        ...

    async def add_async(self, aggregate: TAggregate) -> Result[None]:
        """
        Add new aggregate asynchronously.

        Args:
            aggregate: The aggregate to add

        Returns:
            Result indicating success or failure with error details
        """
        ...

    async def update_async(self, aggregate: TAggregate) -> Result[None]:
        """
        Update existing aggregate asynchronously.

        Args:
            aggregate: The aggregate to update

        Returns:
            Result indicating success or failure with error details.
            May fail due to optimistic concurrency conflicts.
        """
        ...

    async def delete_async(self, id: TId) -> Result[None]:
        """
        Delete aggregate by ID asynchronously.

        Args:
            id: The aggregate identifier

        Returns:
            Result indicating success or failure with error details
        """
        ...

    async def exists_async(self, id: TId) -> bool:
        """
        Check if aggregate exists asynchronously.

        Args:
            id: The aggregate identifier

        Returns:
            True if aggregate exists, False otherwise
        """
        ...