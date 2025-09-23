"""
Contract tests for Maybe[T] functional type.

These tests define the behavioral contract that all Maybe implementations must satisfy.
Tests are written following TDD approach and MUST FAIL before implementation.
"""

import pytest
from typing import Optional
from architecture_core.functional import Maybe


class TestMaybeContract:
    """Contract tests for Maybe[T] functional type compliance"""

    def test_should_create_some_when_some_called_with_value(self):
        """Contract: Maybe.some must create Some with value"""
        # Given
        value = "test-value"

        # When
        maybe = Maybe.some(value)

        # Then
        assert maybe.has_value is True
        assert maybe.value == value

    def test_should_create_none_when_none_called(self):
        """Contract: Maybe.none must create None value"""
        # Given/When
        maybe = Maybe.none()

        # Then
        assert maybe.has_value is False

    def test_should_raise_when_accessing_value_on_none(self):
        """Contract: Maybe.value must raise exception when accessed on None"""
        # Given
        maybe = Maybe.none()

        # When/Then
        with pytest.raises(Exception):
            _ = maybe.value

    def test_should_map_value_when_some_and_mapping_function_provided(self):
        """Contract: Maybe.map must transform Some value using mapping function"""
        # Given
        maybe = Maybe.some(5)
        mapper = lambda x: x * 2

        # When
        mapped_maybe = maybe.map(mapper)

        # Then
        assert mapped_maybe.has_value is True
        assert mapped_maybe.value == 10

    def test_should_not_map_when_none_and_mapping_function_provided(self):
        """Contract: Maybe.map must preserve None without applying mapping function"""
        # Given
        maybe = Maybe.none()
        mapper = lambda x: x * 2

        # When
        mapped_maybe = maybe.map(mapper)

        # Then
        assert mapped_maybe.has_value is False

    def test_should_bind_value_when_some_and_binding_function_provided(self):
        """Contract: Maybe.bind must apply monadic bind operation on Some"""
        # Given
        maybe = Maybe.some(5)
        binder = lambda x: Maybe.some(x * 2)

        # When
        bound_maybe = maybe.bind(binder)

        # Then
        assert bound_maybe.has_value is True
        assert bound_maybe.value == 10

    def test_should_not_bind_when_none_and_binding_function_provided(self):
        """Contract: Maybe.bind must preserve None without applying binding function"""
        # Given
        maybe = Maybe.none()
        binder = lambda x: Maybe.some(x * 2)

        # When
        bound_maybe = maybe.bind(binder)

        # Then
        assert bound_maybe.has_value is False

    def test_should_return_value_when_some_and_or_else_called(self):
        """Contract: Maybe.or_else must return value when Some"""
        # Given
        maybe = Maybe.some("test-value")
        default = "default-value"

        # When
        result = maybe.or_else(default)

        # Then
        assert result == "test-value"

    def test_should_return_default_when_none_and_or_else_called(self):
        """Contract: Maybe.or_else must return default when None"""
        # Given
        maybe = Maybe.none()
        default = "default-value"

        # When
        result = maybe.or_else(default)

        # Then
        assert result == default

    def test_should_return_value_when_some_and_or_else_get_called(self):
        """Contract: Maybe.or_else_get must return value when Some"""
        # Given
        maybe = Maybe.some("test-value")
        factory = lambda: "factory-value"

        # When
        result = maybe.or_else_get(factory)

        # Then
        assert result == "test-value"

    def test_should_call_factory_when_none_and_or_else_get_called(self):
        """Contract: Maybe.or_else_get must call factory when None"""
        # Given
        maybe = Maybe.none()
        factory = lambda: "factory-value"

        # When
        result = maybe.or_else_get(factory)

        # Then
        assert result == "factory-value"

    def test_should_filter_to_some_when_predicate_true(self):
        """Contract: Maybe.filter must remain Some when predicate satisfied"""
        # Given
        maybe = Maybe.some(10)
        predicate = lambda x: x > 5

        # When
        filtered_maybe = maybe.filter(predicate)

        # Then
        assert filtered_maybe.has_value is True
        assert filtered_maybe.value == 10

    def test_should_filter_to_none_when_predicate_false(self):
        """Contract: Maybe.filter must become None when predicate not satisfied"""
        # Given
        maybe = Maybe.some(3)
        predicate = lambda x: x > 5

        # When
        filtered_maybe = maybe.filter(predicate)

        # Then
        assert filtered_maybe.has_value is False

    def test_should_filter_preserve_none_when_none(self):
        """Contract: Maybe.filter must preserve None"""
        # Given
        maybe = Maybe.none()
        predicate = lambda x: x > 5

        # When
        filtered_maybe = maybe.filter(predicate)

        # Then
        assert filtered_maybe.has_value is False

    def test_should_create_some_when_from_optional_with_value(self):
        """Contract: Maybe.from_optional must create Some from non-None Optional"""
        # Given
        optional_value: Optional[str] = "test-value"

        # When
        maybe = Maybe.from_optional(optional_value)

        # Then
        assert maybe.has_value is True
        assert maybe.value == "test-value"

    def test_should_create_none_when_from_optional_with_none(self):
        """Contract: Maybe.from_optional must create None from None Optional"""
        # Given
        optional_value: Optional[str] = None

        # When
        maybe = Maybe.from_optional(optional_value)

        # Then
        assert maybe.has_value is False

    def test_should_chain_operations_when_multiple_maps_applied(self):
        """Contract: Maybe must support chaining multiple map operations"""
        # Given
        maybe = Maybe.some(5)

        # When
        chained_maybe = maybe.map(lambda x: x * 2).map(lambda x: x + 1).map(str)

        # Then
        assert chained_maybe.has_value is True
        assert chained_maybe.value == "11"

    def test_should_short_circuit_when_none_in_chain(self):
        """Contract: Maybe must short-circuit on None in operation chain"""
        # Given
        maybe = Maybe.some(5)

        # When
        chained_maybe = (maybe
                        .map(lambda x: x * 2)
                        .bind(lambda x: Maybe.none())
                        .map(lambda x: x + 1))  # This should not execute

        # Then
        assert chained_maybe.has_value is False

    def test_should_reject_none_value_when_creating_some(self):
        """Contract: Maybe.some must reject None values"""
        # Given/When/Then
        with pytest.raises((ValueError, TypeError)):
            Maybe.some(None)