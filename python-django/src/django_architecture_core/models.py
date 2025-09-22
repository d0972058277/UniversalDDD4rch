"""
Django model mixins for aggregate roots.

This module provides Django-specific model mixins and base classes
for integrating with Django ORM while maintaining DDD principles.
"""

from django.db import models
from django.utils import timezone
from typing import Optional


class DjangoModelMixin(models.Model):
    """
    Django model mixin for aggregate roots with optimistic concurrency.

    Provides standard fields for version control, timestamps, and
    optimistic concurrency control integration with Django ORM.
    """

    version = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        abstract = True

    def increment_version(self) -> None:
        """Increment version for optimistic concurrency control"""
        self.version += 1