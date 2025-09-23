"""
Unit tests for Result error handling and composition.

Tests comprehensive scenarios for Result monadic operations,
error handling patterns, and functional composition.

Test naming: test_should_expected_behavior_when_state_under_test
"""

import pytest
from typing import List

# Import functional types
from architecture_core.functional.result import Result
from architecture_core.functional.error import Error, ErrorCategory


class TestResultErrorHandlingAndComposition:
    """Test Result error handling and composition patterns."""

    def test_should_create_success_result_when_success_called_with_value(self):
        """Test creating successful Result with value."""
        # Given
        value = 42

        # When
        result = Result.success(value)

        # Then
        assert result.is_success is True
        assert result.is_failure is False
        assert result.value == 42

    def test_should_accept_none_value_when_creating_success_for_void_operations(self):
        """Test creating successful Result with None for void operations."""
        # Given & When
        result = Result.success(None)

        # Then
        assert result.is_success is True
        assert result.value is None

    def test_should_create_failure_result_when_failure_called_with_error(self):
        """Test creating failed Result with error."""
        # Given
        error = Error.domain("Test.Error", "Test error message")

        # When
        result = Result.failure(error)

        # Then
        assert result.is_failure is True
        assert result.is_success is False
        assert result.error == error

    def test_should_reject_none_error_when_creating_failure(self):
        """Test that creating failure with None error raises ValueError."""
        # Given & When & Then
        with pytest.raises(ValueError, match="Error cannot be None"):
            Result.failure(None)

    def test_should_raise_error_when_accessing_value_on_failure(self):
        """Test that accessing value on failure raises RuntimeError."""
        # Given
        error = Error.domain("Test.Error", "Test error")
        result = Result.failure(error)

        # When & Then
        with pytest.raises(RuntimeError, match="Cannot access value on failed result"):
            _ = result.value

    def test_should_raise_error_when_accessing_error_on_success(self):
        """Test that accessing error on success raises RuntimeError."""
        # Given
        result = Result.success(42)

        # When & Then
        with pytest.raises(RuntimeError, match="Cannot access error on successful result"):
            _ = result.error

    def test_should_transform_value_when_map_called_on_success(self):
        """Test that map transforms value on successful Result."""
        # Given
        result = Result.success(5)

        # When
        mapped_result = result.map(lambda x: x * 2)

        # Then
        assert mapped_result.is_success is True
        assert mapped_result.value == 10

    def test_should_not_transform_when_map_called_on_failure(self):
        """Test that map doesn't transform on failed Result."""
        # Given
        error = Error.domain("Test.Error", "Test error")
        result = Result.failure(error)

        # When
        mapped_result = result.map(lambda x: x * 2)

        # Then
        assert mapped_result.is_failure is True
        assert mapped_result.error == error

    def test_should_handle_exception_in_map_function(self):
        """Test that exceptions in map function are caught and converted to failure."""
        # Given
        result = Result.success(5)

        # When
        mapped_result = result.map(lambda x: x / 0)  # Division by zero

        # Then
        assert mapped_result.is_failure is True
        assert mapped_result.error.category == ErrorCategory.INFRASTRUCTURE
        assert "exception" in mapped_result.error.message.lower()

    def test_should_chain_operations_when_bind_called_on_success(self):
        """Test that bind chains operations on successful Result."""
        # Given
        result = Result.success(5)

        # When
        bound_result = result.bind(lambda x: Result.success(x * 2))

        # Then
        assert bound_result.is_success is True
        assert bound_result.value == 10

    def test_should_not_chain_when_bind_called_on_failure(self):
        """Test that bind doesn't chain on failed Result."""
        # Given
        error = Error.domain("Test.Error", "Test error")
        result = Result.failure(error)

        # When
        bound_result = result.bind(lambda x: Result.success(x * 2))

        # Then
        assert bound_result.is_failure is True
        assert bound_result.error == error

    def test_should_handle_exception_in_bind_function(self):
        """Test that exceptions in bind function are caught and converted to failure."""
        # Given
        result = Result.success(5)

        # When
        bound_result = result.bind(lambda x: Result.success(x / 0))  # Will throw

        # Then
        assert bound_result.is_failure is True
        assert bound_result.error.category == ErrorCategory.INFRASTRUCTURE

    def test_should_execute_success_handler_when_match_called_on_success(self):
        """Test that match executes success handler on successful Result."""
        # Given
        result = Result.success(42)

        # When
        output = result.match(
            on_success=lambda x: f"Success: {x}",
            on_failure=lambda e: f"Error: {e.message}"
        )

        # Then
        assert output == "Success: 42"

    def test_should_execute_failure_handler_when_match_called_on_failure(self):
        """Test that match executes failure handler on failed Result."""
        # Given
        error = Error.domain("Test.Error", "Something went wrong")
        result = Result.failure(error)

        # When
        output = result.match(
            on_success=lambda x: f"Success: {x}",
            on_failure=lambda e: f"Error: {e.message}"
        )

        # Then
        assert output == "Error: Something went wrong"

    def test_should_validate_predicate_when_ensure_called_on_success(self):
        """Test that ensure validates predicate on successful Result."""
        # Given
        result = Result.success(10)
        error = Error.validation("Test.Validation", "Value must be positive")

        # When
        ensured_result = result.ensure(lambda x: x > 0, error)

        # Then
        assert ensured_result.is_success is True
        assert ensured_result.value == 10

    def test_should_fail_validation_when_ensure_predicate_false(self):
        """Test that ensure fails when predicate returns False."""
        # Given
        result = Result.success(-5)
        error = Error.validation("Test.Validation", "Value must be positive")

        # When
        ensured_result = result.ensure(lambda x: x > 0, error)

        # Then
        assert ensured_result.is_failure is True
        assert ensured_result.error == error

    def test_should_not_validate_when_ensure_called_on_failure(self):
        """Test that ensure doesn't validate on failed Result."""
        # Given
        original_error = Error.domain("Test.Original", "Original error")
        result = Result.failure(original_error)
        validation_error = Error.validation("Test.Validation", "Should not see this")

        # When
        ensured_result = result.ensure(lambda x: x > 0, validation_error)

        # Then
        assert ensured_result.is_failure is True
        assert ensured_result.error == original_error  # Original error preserved

    def test_should_handle_exception_in_ensure_predicate(self):
        """Test that exceptions in ensure predicate are caught."""
        # Given
        result = Result.success(5)
        error = Error.validation("Test.Validation", "Custom validation error")

        # When
        ensured_result = result.ensure(lambda x: x / 0 > 0, error)  # Will throw

        # Then
        assert ensured_result.is_failure is True
        assert ensured_result.error.category == ErrorCategory.INFRASTRUCTURE

    def test_should_combine_all_successes_when_combine_called_with_successes(self):
        """Test that combine returns success with all values when all results succeed."""
        # Given
        results = [
            Result.success(1),
            Result.success(2),
            Result.success(3)
        ]

        # When
        combined = Result.combine(results)

        # Then
        assert combined.is_success is True
        assert combined.value == [1, 2, 3]

    def test_should_return_first_failure_when_combine_called_with_failures(self):
        """Test that combine returns first failure when any result fails."""
        # Given
        error1 = Error.domain("Test.Error1", "First error")
        error2 = Error.domain("Test.Error2", "Second error")
        results = [
            Result.success(1),
            Result.failure(error1),
            Result.success(3),
            Result.failure(error2)
        ]

        # When
        combined = Result.combine(results)

        # Then
        assert combined.is_failure is True
        assert combined.error == error1  # First failure

    def test_should_return_empty_success_when_combine_called_with_empty_list(self):
        """Test that combine returns empty success list for empty input."""
        # Given
        results = []

        # When
        combined = Result.combine(results)

        # Then
        assert combined.is_success is True
        assert combined.value == []

    def test_should_chain_multiple_map_operations(self):
        """Test chaining multiple map operations."""
        # Given
        result = Result.success(5)

        # When
        chained_result = (result
                         .map(lambda x: x * 2)      # 10
                         .map(lambda x: x + 3)      # 13
                         .map(lambda x: str(x)))    # "13"

        # Then
        assert chained_result.is_success is True
        assert chained_result.value == "13"

    def test_should_chain_multiple_bind_operations(self):
        """Test chaining multiple bind operations."""
        # Given
        result = Result.success(5)

        # When
        chained_result = (result
                         .bind(lambda x: Result.success(x * 2))
                         .bind(lambda x: Result.success(x + 3))
                         .bind(lambda x: Result.success(str(x))))

        # Then
        assert chained_result.is_success is True
        assert chained_result.value == "13"

    def test_should_stop_chain_at_first_failure_in_bind_operations(self):
        """Test that bind chain stops at first failure."""
        # Given
        result = Result.success(5)
        error = Error.domain("Test.Error", "Chain broken")

        # When
        chained_result = (result
                         .bind(lambda x: Result.success(x * 2))     # Success: 10
                         .bind(lambda x: Result.failure(error))     # Failure
                         .bind(lambda x: Result.success(x + 100)))  # Should not execute

        # Then
        assert chained_result.is_failure is True
        assert chained_result.error == error

    def test_should_combine_map_and_bind_operations(self):
        """Test combining map and bind operations."""
        # Given
        result = Result.success(5)

        # When
        combined_result = (result
                          .map(lambda x: x * 2)                    # 10
                          .bind(lambda x: Result.success(x + 3))   # 13
                          .map(lambda x: str(x))                   # "13"
                          .bind(lambda x: Result.success(len(x))))  # 2

        # Then
        assert combined_result.is_success is True
        assert combined_result.value == 2

    def test_should_handle_complex_error_composition_patterns(self):
        """Test complex error composition patterns."""
        # Given
        def divide_by_two(x: int) -> Result[float]:
            if x % 2 != 0:
                return Result.failure(Error.validation("Math.NotEven", f"Value {x} is not even"))
            return Result.success(x / 2)

        def check_positive(x: float) -> Result[float]:
            return Result.success(x).ensure(
                lambda val: val > 0,
                Error.validation("Math.NotPositive", "Value must be positive")
            )

        # When - Success case
        success_result = (Result.success(8)
                         .bind(divide_by_two)    # 4.0
                         .bind(check_positive))  # 4.0

        # When - Validation failure case
        odd_result = (Result.success(7)
                     .bind(divide_by_two)     # Failure: not even
                     .bind(check_positive))   # Should not execute

        # When - Ensure failure case
        negative_result = (Result.success(-4)
                          .bind(divide_by_two)   # -2.0
                          .bind(check_positive)) # Failure: not positive

        # Then
        assert success_result.is_success is True
        assert success_result.value == 4.0

        assert odd_result.is_failure is True
        assert "not even" in odd_result.error.message

        assert negative_result.is_failure is True
        assert "positive" in negative_result.error.message

    def test_should_maintain_equality_based_on_content(self):
        """Test that Result equality is based on success/failure and content."""
        # Given
        success1 = Result.success(42)
        success2 = Result.success(42)
        success3 = Result.success(43)

        error = Error.domain("Test.Error", "Test error")
        failure1 = Result.failure(error)
        failure2 = Result.failure(error)

        # When & Then
        assert success1 == success2    # Same success value
        assert success1 != success3    # Different success value
        assert success1 != failure1    # Success vs failure
        assert failure1 == failure2    # Same failure error

    def test_should_maintain_hash_consistency_with_equality(self):
        """Test that equal Results have equal hash codes."""
        # Given
        success1 = Result.success(42)
        success2 = Result.success(42)

        error = Error.domain("Test.Error", "Test error")
        failure1 = Result.failure(error)
        failure2 = Result.failure(error)

        # When & Then
        assert success1 == success2
        assert hash(success1) == hash(success2)

        assert failure1 == failure2
        assert hash(failure1) == hash(failure2)

    def test_should_provide_meaningful_string_representation(self):
        """Test that string representation is meaningful."""
        # Given
        success = Result.success(42)
        error = Error.domain("Test.Error", "Test error message")
        failure = Result.failure(error)

        # When
        success_str = str(success)
        failure_str = str(failure)

        # Then
        assert "Success" in success_str and "42" in success_str
        assert "Failure" in failure_str and ("Test.Error" in failure_str or "Test error message" in failure_str)

    def test_should_handle_nested_result_operations(self):
        """Test handling of nested Result operations."""
        # Given
        def parse_int(s: str) -> Result[int]:
            try:
                return Result.success(int(s))
            except ValueError:
                return Result.failure(Error.validation("Parse.InvalidInt", f"Cannot parse '{s}' as integer"))

        def square_root(x: int) -> Result[float]:
            if x < 0:
                return Result.failure(Error.domain("Math.NegativeRoot", "Cannot take square root of negative number"))
            return Result.success(x ** 0.5)

        # When
        valid_result = (Result.success("16")
                       .bind(parse_int)
                       .bind(square_root))

        invalid_parse_result = (Result.success("abc")
                               .bind(parse_int)
                               .bind(square_root))

        negative_result = (Result.success("-9")
                          .bind(parse_int)
                          .bind(square_root))

        # Then
        assert valid_result.is_success is True
        assert valid_result.value == 4.0

        assert invalid_parse_result.is_failure is True
        assert "parse" in invalid_parse_result.error.message.lower()

        assert negative_result.is_failure is True
        assert "negative" in negative_result.error.message.lower()


if __name__ == "__main__":
    # Run tests when executed directly
    import sys

    # Create test instance and run all test methods
    test_instance = TestResultErrorHandlingAndComposition()

    # Get all test methods
    test_methods = [method for method in dir(test_instance)
                   if method.startswith('test_should_')]

    print(f"Running {len(test_methods)} Result error handling and composition tests...")

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
        print(f"\n✅ All {len(test_methods)} Result error handling and composition tests passed!")
        sys.exit(0)