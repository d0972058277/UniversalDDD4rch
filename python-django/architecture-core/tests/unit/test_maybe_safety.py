"""
Unit tests for Maybe null safety and chaining.

Tests comprehensive scenarios for Maybe monadic operations,
null safety patterns, and functional composition.

Test naming: test_should_expected_behavior_when_state_under_test
"""

import pytest
from typing import Optional

# Import functional types
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.result import Result
from architecture_core.functional.error import Error


class TestMaybeNullSafetyAndChaining:
    """Test Maybe null safety and chaining patterns."""

    def test_should_create_some_when_some_called_with_value(self):
        """Test creating Maybe.some with value."""
        # Given
        value = "test value"

        # When
        maybe = Maybe.some(value)

        # Then
        assert maybe.has_value is True
        assert maybe.value == "test value"

    def test_should_reject_none_value_when_creating_some(self):
        """Test that creating some with None raises ValueError."""
        # Given & When & Then
        with pytest.raises(ValueError, match="Value cannot be None"):
            Maybe.some(None)

    def test_should_create_none_when_none_called(self):
        """Test creating Maybe.none."""
        # Given & When
        maybe = Maybe.none()

        # Then
        assert maybe.has_value is False

    def test_should_raise_error_when_accessing_value_on_none(self):
        """Test that accessing value on none raises RuntimeError."""
        # Given
        maybe = Maybe.none()

        # When & Then
        with pytest.raises(RuntimeError, match="Cannot access value on Maybe.none"):
            _ = maybe.value

    def test_should_transform_value_when_map_called_on_some(self):
        """Test that map transforms value on Maybe.some."""
        # Given
        maybe = Maybe.some("hello")

        # When
        mapped = maybe.map(str.upper)

        # Then
        assert mapped.has_value is True
        assert mapped.value == "HELLO"

    def test_should_not_transform_when_map_called_on_none(self):
        """Test that map doesn't transform on Maybe.none."""
        # Given
        maybe = Maybe.none()

        # When
        mapped = maybe.map(str.upper)

        # Then
        assert mapped.has_value is False

    def test_should_return_none_when_map_function_returns_none(self):
        """Test that map returns none when function returns None."""
        # Given
        maybe = Maybe.some("test")

        # When
        mapped = maybe.map(lambda x: None)

        # Then
        assert mapped.has_value is False

    def test_should_handle_exception_in_map_function_gracefully(self):
        """Test that exceptions in map function are handled gracefully."""
        # Given
        maybe = Maybe.some("test")

        # When
        mapped = maybe.map(lambda x: x / 0)  # Will throw

        # Then
        assert mapped.has_value is False  # Should return none, not throw

    def test_should_chain_operations_when_bind_called_on_some(self):
        """Test that bind chains operations on Maybe.some."""
        # Given
        maybe = Maybe.some(5)

        # When
        bound = maybe.bind(lambda x: Maybe.some(x * 2))

        # Then
        assert bound.has_value is True
        assert bound.value == 10

    def test_should_not_chain_when_bind_called_on_none(self):
        """Test that bind doesn't chain on Maybe.none."""
        # Given
        maybe = Maybe.none()

        # When
        bound = maybe.bind(lambda x: Maybe.some(x * 2))

        # Then
        assert bound.has_value is False

    def test_should_handle_bind_function_returning_none(self):
        """Test that bind handles function returning none."""
        # Given
        maybe = Maybe.some(5)

        # When
        bound = maybe.bind(lambda x: Maybe.none())

        # Then
        assert bound.has_value is False

    def test_should_handle_exception_in_bind_function_gracefully(self):
        """Test that exceptions in bind function are handled gracefully."""
        # Given
        maybe = Maybe.some(5)

        # When
        bound = maybe.bind(lambda x: Maybe.some(x / 0))  # Will throw

        # Then
        assert bound.has_value is False  # Should return none, not throw

    def test_should_return_value_when_or_else_called_on_some(self):
        """Test that or_else returns value when called on some."""
        # Given
        maybe = Maybe.some("actual value")
        default = "default value"

        # When
        result = maybe.or_else(default)

        # Then
        assert result == "actual value"

    def test_should_return_default_when_or_else_called_on_none(self):
        """Test that or_else returns default when called on none."""
        # Given
        maybe = Maybe.none()
        default = "default value"

        # When
        result = maybe.or_else(default)

        # Then
        assert result == "default value"

    def test_should_return_value_when_or_else_get_called_on_some(self):
        """Test that or_else_get returns value when called on some."""
        # Given
        maybe = Maybe.some("actual value")

        # When
        result = maybe.or_else_get(lambda: "computed default")

        # Then
        assert result == "actual value"

    def test_should_compute_default_when_or_else_get_called_on_none(self):
        """Test that or_else_get computes default when called on none."""
        # Given
        maybe = Maybe.none()

        # When
        result = maybe.or_else_get(lambda: "computed default")

        # Then
        assert result == "computed default"

    def test_should_preserve_value_when_filter_predicate_true(self):
        """Test that filter preserves value when predicate returns True."""
        # Given
        maybe = Maybe.some(10)

        # When
        filtered = maybe.filter(lambda x: x > 5)

        # Then
        assert filtered.has_value is True
        assert filtered.value == 10

    def test_should_return_none_when_filter_predicate_false(self):
        """Test that filter returns none when predicate returns False."""
        # Given
        maybe = Maybe.some(3)

        # When
        filtered = maybe.filter(lambda x: x > 5)

        # Then
        assert filtered.has_value is False

    def test_should_return_none_when_filter_called_on_none(self):
        """Test that filter returns none when called on none."""
        # Given
        maybe = Maybe.none()

        # When
        filtered = maybe.filter(lambda x: True)

        # Then
        assert filtered.has_value is False

    def test_should_handle_exception_in_filter_predicate_gracefully(self):
        """Test that exceptions in filter predicate are handled gracefully."""
        # Given
        maybe = Maybe.some(5)

        # When
        filtered = maybe.filter(lambda x: x / 0 > 0)  # Will throw

        # Then
        assert filtered.has_value is False  # Should return none, not throw

    def test_should_create_some_when_from_optional_called_with_value(self):
        """Test creating Maybe from Optional with value."""
        # Given
        optional_value: Optional[str] = "test"

        # When
        maybe = Maybe.from_optional(optional_value)

        # Then
        assert maybe.has_value is True
        assert maybe.value == "test"

    def test_should_create_none_when_from_optional_called_with_none(self):
        """Test creating Maybe from Optional with None."""
        # Given
        optional_value: Optional[str] = None

        # When
        maybe = Maybe.from_optional(optional_value)

        # Then
        assert maybe.has_value is False

    def test_should_convert_to_success_result_when_to_result_called_on_some(self):
        """Test converting some to successful Result."""
        # Given
        maybe = Maybe.some("test value")
        error = Error.domain("Test.NotFound", "Value not found")

        # When
        result = maybe.to_result(error)

        # Then
        assert result.is_success is True
        assert result.value == "test value"

    def test_should_convert_to_failure_result_when_to_result_called_on_none(self):
        """Test converting none to failed Result."""
        # Given
        maybe = Maybe.none()
        error = Error.domain("Test.NotFound", "Value not found")

        # When
        result = maybe.to_result(error)

        # Then
        assert result.is_failure is True
        assert result.error == error

    def test_should_chain_multiple_map_operations(self):
        """Test chaining multiple map operations."""
        # Given
        maybe = Maybe.some("hello")

        # When
        chained = (maybe
                  .map(str.upper)     # "HELLO"
                  .map(len)           # 5
                  .map(lambda x: x * 2))  # 10

        # Then
        assert chained.has_value is True
        assert chained.value == 10

    def test_should_chain_multiple_bind_operations(self):
        """Test chaining multiple bind operations."""
        # Given
        maybe = Maybe.some(5)

        # When
        chained = (maybe
                  .bind(lambda x: Maybe.some(x * 2))    # 10
                  .bind(lambda x: Maybe.some(x + 3))    # 13
                  .bind(lambda x: Maybe.some(str(x))))  # "13"

        # Then
        assert chained.has_value is True
        assert chained.value == "13"

    def test_should_stop_chain_at_first_none_in_bind_operations(self):
        """Test that bind chain stops at first none."""
        # Given
        maybe = Maybe.some(5)

        # When
        chained = (maybe
                  .bind(lambda x: Maybe.some(x * 2))    # Some(10)
                  .bind(lambda x: Maybe.none())         # None
                  .bind(lambda x: Maybe.some(x + 100))) # Should not execute

        # Then
        assert chained.has_value is False

    def test_should_stop_chain_at_first_none_in_map_operations(self):
        """Test that map chain stops at first none."""
        # Given
        maybe = Maybe.some("test")

        # When
        chained = (maybe
                  .map(str.upper)        # Some("TEST")
                  .map(lambda x: None)   # None
                  .map(len))             # Should not execute

        # Then
        assert chained.has_value is False

    def test_should_combine_map_bind_and_filter_operations(self):
        """Test combining map, bind, and filter operations."""
        # Given
        maybe = Maybe.some("hello")

        # When
        combined = (maybe
                   .map(str.upper)                           # "HELLO"
                   .filter(lambda x: len(x) > 3)           # "HELLO" (passes)
                   .bind(lambda x: Maybe.some(len(x)))      # 5
                   .map(lambda x: x * 2)                    # 10
                   .filter(lambda x: x > 5))                # 10 (passes)

        # Then
        assert combined.has_value is True
        assert combined.value == 10

    def test_should_handle_complex_null_safety_patterns(self):
        """Test complex null safety patterns."""
        # Given
        def safe_divide(x: int, y: int) -> Maybe[float]:
            if y == 0:
                return Maybe.none()
            return Maybe.some(x / y)

        def safe_int_parse(s: str) -> Maybe[int]:
            try:
                return Maybe.some(int(s))
            except ValueError:
                return Maybe.none()

        # When - Success case
        success_result = (Maybe.some("10")
                         .bind(safe_int_parse)              # Some(10)
                         .bind(lambda x: safe_divide(x, 2)) # Some(5.0)
                         .map(lambda x: x * 2))             # Some(10.0)

        # When - Parse failure case
        parse_failure = (Maybe.some("abc")
                        .bind(safe_int_parse)               # None
                        .bind(lambda x: safe_divide(x, 2))  # Should not execute
                        .map(lambda x: x * 2))              # Should not execute

        # When - Division by zero case
        division_failure = (Maybe.some("5")
                           .bind(safe_int_parse)            # Some(5)
                           .bind(lambda x: safe_divide(x, 0)) # None
                           .map(lambda x: x * 2))           # Should not execute

        # Then
        assert success_result.has_value is True
        assert success_result.value == 10.0

        assert parse_failure.has_value is False

        assert division_failure.has_value is False

    def test_should_maintain_equality_based_on_content(self):
        """Test that Maybe equality is based on has_value and content."""
        # Given
        some1 = Maybe.some(42)
        some2 = Maybe.some(42)
        some3 = Maybe.some(43)
        none1 = Maybe.none()
        none2 = Maybe.none()

        # When & Then
        assert some1 == some2     # Same some value
        assert some1 != some3     # Different some value
        assert some1 != none1     # Some vs none
        assert none1 == none2     # Both none

    def test_should_maintain_hash_consistency_with_equality(self):
        """Test that equal Maybes have equal hash codes."""
        # Given
        some1 = Maybe.some(42)
        some2 = Maybe.some(42)
        none1 = Maybe.none()
        none2 = Maybe.none()

        # When & Then
        assert some1 == some2
        assert hash(some1) == hash(some2)

        assert none1 == none2
        assert hash(none1) == hash(none2)

    def test_should_provide_meaningful_string_representation(self):
        """Test that string representation is meaningful."""
        # Given
        some = Maybe.some(42)
        none = Maybe.none()

        # When
        some_str = str(some)
        none_str = str(none)

        # Then
        assert "Some" in some_str and "42" in some_str
        assert "None" in none_str

    def test_should_handle_nested_maybe_operations(self):
        """Test handling of nested Maybe operations."""
        # Given
        def find_by_id(id: int) -> Maybe[str]:
            data = {1: "first", 2: "hi", 3: "third"}
            return Maybe.from_optional(data.get(id))

        def format_data(data: str) -> Maybe[str]:
            if len(data) < 3:
                return Maybe.none()
            return Maybe.some(f"Formatted: {data.upper()}")

        # When
        found_result = (Maybe.some(1)
                       .bind(find_by_id)
                       .bind(format_data))

        not_found_result = (Maybe.some(99)
                           .bind(find_by_id)
                           .bind(format_data))

        too_short_result = (Maybe.some(2)
                           .bind(find_by_id)
                           .bind(format_data))

        # Then
        assert found_result.has_value is True
        assert found_result.value == "Formatted: FIRST"

        assert not_found_result.has_value is False

        assert too_short_result.has_value is False

    def test_should_handle_maybe_with_collections(self):
        """Test Maybe with collection operations."""
        # Given
        maybe_list = Maybe.some([1, 2, 3, 4, 5])

        # When
        filtered_and_mapped = (maybe_list
                              .map(lambda lst: [x for x in lst if x > 2])  # [3, 4, 5]
                              .filter(lambda lst: len(lst) > 0)           # Has items
                              .map(lambda lst: sum(lst)))                 # 12

        empty_filtered = (maybe_list
                         .map(lambda lst: [x for x in lst if x > 10])   # []
                         .filter(lambda lst: len(lst) > 0))             # Empty list filtered out

        # Then
        assert filtered_and_mapped.has_value is True
        assert filtered_and_mapped.value == 12

        assert empty_filtered.has_value is False

    def test_should_support_safe_navigation_patterns(self):
        """Test safe navigation patterns with Maybe."""
        # Given
        class Person:
            def __init__(self, name: str, address: Optional['Address'] = None):
                self.name = name
                self.address = address

        class Address:
            def __init__(self, street: str, city: Optional[str] = None):
                self.street = street
                self.city = city

        person_with_city = Person("John", Address("123 Main St", "Springfield"))
        person_without_city = Person("Jane", Address("456 Oak Ave"))
        person_without_address = Person("Bob")

        # When
        def get_city(person: Person) -> Maybe[str]:
            return (Maybe.from_optional(person.address)
                   .bind(lambda addr: Maybe.from_optional(addr.city)))

        city1 = get_city(person_with_city)
        city2 = get_city(person_without_city)
        city3 = get_city(person_without_address)

        # Then
        assert city1.has_value is True
        assert city1.value == "Springfield"

        assert city2.has_value is False  # No city
        assert city3.has_value is False  # No address


if __name__ == "__main__":
    # Run tests when executed directly
    import sys

    # Create test instance and run all test methods
    test_instance = TestMaybeNullSafetyAndChaining()

    # Get all test methods
    test_methods = [method for method in dir(test_instance)
                   if method.startswith('test_should_')]

    print(f"Running {len(test_methods)} Maybe null safety and chaining tests...")

    failed_tests = []

    for test_method_name in test_methods:
        try:
            test_method = getattr(test_instance, test_method_name)
            test_method()
            print(f"✅ {test_method_name}")
        except Exception as e:
            print(f"❌ {test_method_name}: {e}")
            failed_tests.append(test_method_name)

    if failed_tests:
        print(f"\n❌ {len(failed_tests)} tests failed:")
        for test_name in failed_tests:
            print(f"  - {test_name}")
        sys.exit(1)
    else:
        print(f"\n✅ All {len(test_methods)} Maybe null safety and chaining tests passed!")
        sys.exit(0)