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

    async def exists_async(self, id: TId) -> bool:
        """Check if aggregate exists"""
        return await self.model_class.objects.filter(pk=str(id)).aexists()