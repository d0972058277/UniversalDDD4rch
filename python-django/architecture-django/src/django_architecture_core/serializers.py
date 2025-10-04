"""
Django serialization utilities for Result/Maybe types.

This module provides Django REST Framework serializers and utilities
for working with functional types (Result, Maybe) in API responses.
"""

from typing import Any, Dict, Optional, Type, TypeVar
from django.core.serializers.json import DjangoJSONEncoder
from django.forms import Field
from django.forms.widgets import HiddenInput
from architecture_core.functional import Result, Maybe, Error, ErrorCategory
import json

T = TypeVar('T')


class FunctionalTypeJSONEncoder(DjangoJSONEncoder):
    """
    Custom JSON encoder for Result and Maybe types.

    Serializes functional types to JSON with type information
    to enable proper deserialization on the client side.
    """

    def default(self, obj: Any) -> Any:
        if isinstance(obj, Result):
            if obj.is_success:
                return {
                    "type": "Result",
                    "success": True,
                    "value": obj.value
                }
            else:
                return {
                    "type": "Result",
                    "success": False,
                    "error": {
                        "code": obj.error.code,
                        "message": obj.error.message,
                        "category": obj.error.category.value,
                        "metadata": obj.error.metadata
                    }
                }

        if isinstance(obj, Maybe):
            if obj.has_value:
                return {
                    "type": "Maybe",
                    "hasValue": True,
                    "value": obj.value
                }
            else:
                return {
                    "type": "Maybe",
                    "hasValue": False,
                    "value": None
                }

        if isinstance(obj, Error):
            return {
                "code": obj.code,
                "message": obj.message,
                "category": obj.category.value,
                "metadata": obj.metadata
            }

        if isinstance(obj, ErrorCategory):
            return obj.value

        return super().default(obj)


class ResultField(Field):
    """
    Django form field for Result types.

    Handles validation and conversion of Result values
    in Django forms and admin interfaces.
    """

    widget = HiddenInput

    def __init__(self, result_type: Type = None, **kwargs):
        self.result_type = result_type
        super().__init__(**kwargs)

    def to_python(self, value: Any) -> Optional[Result]:
        """Convert form input to Result type"""
        if value is None or value == '':
            return None

        if isinstance(value, Result):
            return value

        # Try to parse JSON representation
        if isinstance(value, str):
            try:
                data = json.loads(value)
                return self._deserialize_result(data)
            except (json.JSONDecodeError, KeyError, ValueError):
                raise ValueError("Invalid Result format")

        raise ValueError(f"Cannot convert {type(value)} to Result")

    def _deserialize_result(self, data: Dict[str, Any]) -> Result:
        """Deserialize Result from dictionary"""
        if data.get("type") != "Result":
            raise ValueError("Data is not a Result type")

        if data.get("success", False):
            return Result.success(data.get("value"))
        else:
            error_data = data.get("error", {})
            error = Error(
                code=error_data.get("code", "Unknown"),
                message=error_data.get("message", "Unknown error"),
                category=ErrorCategory(error_data.get("category", "Infrastructure")),
                metadata=error_data.get("metadata", {})
            )
            return Result.failure(error)


class MaybeField(Field):
    """
    Django form field for Maybe types.

    Handles validation and conversion of Maybe values
    in Django forms and admin interfaces.
    """

    widget = HiddenInput

    def __init__(self, maybe_type: Type = None, **kwargs):
        self.maybe_type = maybe_type
        super().__init__(**kwargs)

    def to_python(self, value: Any) -> Optional[Maybe]:
        """Convert form input to Maybe type"""
        if value is None or value == '':
            return Maybe.none()

        if isinstance(value, Maybe):
            return value

        # Try to parse JSON representation
        if isinstance(value, str):
            try:
                data = json.loads(value)
                return self._deserialize_maybe(data)
            except (json.JSONDecodeError, KeyError, ValueError):
                raise ValueError("Invalid Maybe format")

        # Treat any non-None value as Some
        return Maybe.some(value)

    def _deserialize_maybe(self, data: Dict[str, Any]) -> Maybe:
        """Deserialize Maybe from dictionary"""
        if data.get("type") != "Maybe":
            raise ValueError("Data is not a Maybe type")

        if data.get("hasValue", False):
            return Maybe.some(data.get("value"))
        else:
            return Maybe.none()


def result_to_dict(result: Result[T]) -> Dict[str, Any]:
    """
    Convert Result to dictionary for JSON serialization.

    Args:
        result: Result instance to convert

    Returns:
        Dictionary representation of the Result
    """
    encoder = FunctionalTypeJSONEncoder()
    return encoder.default(result)


def maybe_to_dict(maybe: Maybe[T]) -> Dict[str, Any]:
    """
    Convert Maybe to dictionary for JSON serialization.

    Args:
        maybe: Maybe instance to convert

    Returns:
        Dictionary representation of the Maybe
    """
    encoder = FunctionalTypeJSONEncoder()
    return encoder.default(maybe)


def dict_to_result(data: Dict[str, Any]) -> Result:
    """
    Convert dictionary to Result instance.

    Args:
        data: Dictionary representation of Result

    Returns:
        Result instance

    Raises:
        ValueError: If data format is invalid
    """
    field = ResultField()
    return field._deserialize_result(data)


def dict_to_maybe(data: Dict[str, Any]) -> Maybe:
    """
    Convert dictionary to Maybe instance.

    Args:
        data: Dictionary representation of Maybe

    Returns:
        Maybe instance

    Raises:
        ValueError: If data format is invalid
    """
    field = MaybeField()
    return field._deserialize_maybe(data)


# Django REST Framework integration (if available)
try:
    from rest_framework import serializers
    from rest_framework.fields import Field as DRFField

    class ResultSerializer(DRFField):
        """Django REST Framework serializer field for Result types"""

        def to_representation(self, value: Result) -> Dict[str, Any]:
            """Convert Result to JSON representation"""
            return result_to_dict(value)

        def to_internal_value(self, data: Any) -> Result:
            """Convert JSON data to Result instance"""
            if isinstance(data, dict):
                return dict_to_result(data)
            raise serializers.ValidationError("Invalid Result format")

    class MaybeSerializer(DRFField):
        """Django REST Framework serializer field for Maybe types"""

        def to_representation(self, value: Maybe) -> Dict[str, Any]:
            """Convert Maybe to JSON representation"""
            return maybe_to_dict(value)

        def to_internal_value(self, data: Any) -> Maybe:
            """Convert JSON data to Maybe instance"""
            if isinstance(data, dict):
                return dict_to_maybe(data)
            raise serializers.ValidationError("Invalid Maybe format")

except ImportError:
    # Django REST Framework not available
    ResultSerializer = None
    MaybeSerializer = None