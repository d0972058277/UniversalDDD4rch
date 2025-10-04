"""
Django repository base class with ORM operations.

This module provides Django-specific repository implementations
using Django ORM with async support and Result-based error handling.
"""

from typing import TypeVar, Generic, Type, Any
from abc import ABC, abstractmethod
from django.db import models
from django.core.exceptions import ObjectDoesNotExist
from architecture_core.domain import Repository, AggregateRoot
from architecture_core.domain.protocols import EntityId
from architecture_core.functional import Result, Maybe, Error

TAggregate = TypeVar('TAggregate', bound=AggregateRoot)
TId = TypeVar('TId', bound=EntityId)
TModel = TypeVar('TModel', bound=models.Model)


class DjangoRepository(Repository[TAggregate, TId], ABC, Generic[TAggregate, TId, TModel]):
    """
    Django-specific repository implementation with ORM operations.

    Provides base functionality for Django ORM integration while
    maintaining domain abstractions and Result-based error handling.
    """

    def __init__(self, model_class: Type[TModel]) -> None:
        """Initialize with Django model class"""
        self.model_class = model_class

    @abstractmethod
    def _map_to_domain(self, model_instance: TModel) -> TAggregate:
        """Map Django model to domain aggregate"""
        ...

    @abstractmethod
    def _map_to_model(self, aggregate: TAggregate) -> TModel:
        """Map domain aggregate to Django model"""
        ...

    async def get_by_id_async(self, id: TId) -> Maybe[TAggregate]:
        """Django ORM implementation of get by ID"""
        try:
            model_instance = await self.model_class.objects.aget(pk=str(id))
            domain_aggregate = self._map_to_domain(model_instance)
            return Maybe.some(domain_aggregate)
        except ObjectDoesNotExist:
            return Maybe.none()
        except Exception as ex:
            # Log exception and return None for safety
            return Maybe.none()

    async def add_async(self, aggregate: TAggregate) -> Result[None]:
        """Django ORM implementation of add"""
        try:
            model_instance = self._map_to_model(aggregate)
            await model_instance.asave()
            return Result.success(None)
        except Exception as ex:
            return Result.failure(Error.infrastructure(
                "Repository.Add.Exception",
                f"Failed to add aggregate: {str(ex)}",
                ex
            ))

    async def update_async(self, aggregate: TAggregate) -> Result[None]:
        """Django ORM implementation of update with optimistic concurrency"""
        try:
            model_instance = self._map_to_model(aggregate)

            # Optimistic concurrency check
            current_version = aggregate.version
            affected_rows = await self.model_class.objects.filter(
                pk=str(aggregate.id),
                version=current_version
            ).aupdate(
                version=current_version + 1,
                **{field.name: getattr(model_instance, field.name)
                   for field in model_instance._meta.fields
                   if field.name not in ['id', 'version']}
            )

            if affected_rows == 0:
                return Result.failure(Error.concurrency(
                    "Repository.Update.ConcurrencyConflict",
                    f"Aggregate {aggregate.id} was modified by another transaction"
                ))

            # Update aggregate version
            aggregate.increment_version()
            return Result.success(None)

        except Exception as ex:
            return Result.failure(Error.infrastructure(
                "Repository.Update.Exception",
                f"Failed to update aggregate: {str(ex)}",
                ex
            ))

    async def delete_async(self, id: TId) -> Result[None]:
        """Django ORM implementation of delete"""
        try:
            deleted_count, _ = await self.model_class.objects.filter(pk=str(id)).adelete()
            if deleted_count == 0:
                return Result.failure(Error.domain(
                    "Repository.Delete.NotFound",
                    f"Aggregate with ID {id} not found"
                ))
            return Result.success(None)
        except Exception as ex:
            return Result.failure(Error.infrastructure(
                "Repository.Delete.Exception",
                f"Failed to delete aggregate: {str(ex)}",
                ex
            ))

    async def exists_async(self, id: TId) -> bool:
        """Check if aggregate exists"""
        return await self.model_class.objects.filter(pk=str(id)).aexists()