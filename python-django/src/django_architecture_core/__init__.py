"""
Django integration package for Architecture.Core.

This package provides Django-specific implementations and utilities:
- DjangoModelMixin: Django model integration for aggregates
- DjangoRepository: ORM-based repository implementations
- Transaction management utilities
- Django serialization support

Usage:
    from django_architecture_core import DjangoRepository, DjangoModelMixin

Note: This package requires Django 4+ and is optional.
"""

# Import Django components
from .models import DjangoModelMixin
from .repositories import DjangoRepository
from .serializers import (
    FunctionalTypeJSONEncoder,
    ResultField,
    MaybeField,
    result_to_dict,
    maybe_to_dict,
    dict_to_result,
    dict_to_maybe,
    ResultSerializer,
    MaybeSerializer,
)

__all__ = [
    # Model integration
    "DjangoModelMixin",
    # Repository pattern
    "DjangoRepository",
    # Serialization utilities
    "FunctionalTypeJSONEncoder",
    "ResultField",
    "MaybeField",
    "result_to_dict",
    "maybe_to_dict",
    "dict_to_result",
    "dict_to_maybe",
    "ResultSerializer",
    "MaybeSerializer",
]