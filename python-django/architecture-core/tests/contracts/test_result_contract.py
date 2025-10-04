"""
Contract tests for Result[T] functional type.

These tests define the behavioral contract that all Result implementations must satisfy.
Tests are written following TDD approach and MUST FAIL before implementation.

Test naming: test_should_expected_behavior_when_state_under_test
Test structure: Given-When-Then blocks with explicit comments
"""

import pytest
from typing import Callable, List
from architecture_core.functional import Result, Error, ErrorCategory


class TestResultContract:
    """Contract tests for Result[T] functional type compliance"""

    def test_should_create_success_when_success_called_with_value(self):
        """
        Contract: Result.success must create successful result with value
        """
        # Given
        value = "test-value"

        # When
        result = Result.success(value)

        # Then
        assert result.is_success is True
        assert result.is_failure is False
        assert result.value == value

    def test_should_create_failure_when_failure_called_with_error(self):
        """
        Contract: Result.failure must create failed result with error
        """
        # Given
        error = Error.domain("TEST.Error", "Test error message")

        # When
        result = Result.failure(error)

        # Then
        assert result.is_success is False
        assert result.is_failure is True
        assert result.error == error

    def test_should_raise_when_accessing_value_on_failure(self):
        """
        Contract: Result.value must raise exception when accessed on failure
        """
        # Given
        error = Error.domain("TEST.Error", "Test error message")
        result = Result.failure(error)

        # When/Then
        with pytest.raises(Exception):
            _ = result.value

    def test_should_raise_when_accessing_error_on_success(self):
        """
        Contract: Result.error must raise exception when accessed on success
        """
        # Given
        result = Result.success("test-value")

        # When/Then
        with pytest.raises(Exception):
            _ = result.error

    def test_should_map_value_when_success_and_mapping_function_provided(self):
        """
        Contract: Result.map must transform success value using mapping function
        """
        # Given
        result = Result.success(5)
        mapper = lambda x: x * 2

        # When
        mapped_result = result.map(mapper)

        # Then
        assert mapped_result.is_success is True
        assert mapped_result.value == 10

    def test_should_not_map_when_failure_and_mapping_function_provided(self):
        """
        Contract: Result.map must preserve failure without applying mapping function
        """
        # Given
        error = Error.domain("TEST.Error", "Test error message")
        result = Result.failure(error)
        mapper = lambda x: x * 2

        # When
        mapped_result = result.map(mapper)

        # Then
        assert mapped_result.is_success is False
        assert mapped_result.error == error

    def test_should_bind_value_when_success_and_binding_function_provided(self):
        """
        Contract: Result.bind must apply monadic bind operation on success
        """
        # Given
        result = Result.success(5)
        binder = lambda x: Result.success(x * 2)

        # When
        bound_result = result.bind(binder)

        # Then
        assert bound_result.is_success is True
        assert bound_result.value == 10

    def test_should_not_bind_when_failure_and_binding_function_provided(self):
        """
        Contract: Result.bind must preserve failure without applying binding function
        """
        # Given
        error = Error.domain("TEST.Error", "Test error message")
        result = Result.failure(error)
        binder = lambda x: Result.success(x * 2)

        # When
        bound_result = result.bind(binder)

        # Then
        assert bound_result.is_success is False
        assert bound_result.error == error

    def test_should_match_success_when_success_and_match_called(self):
        """
        Contract: Result.match must call success handler for successful result
        """
        # Given
        result = Result.success("test-value")
        success_handler = lambda x: f"Success: {x}"
        failure_handler = lambda e: f"Failure: {e.message}"

        # When
        matched_result = result.match(success_handler, failure_handler)

        # Then
        assert matched_result == "Success: test-value"

    def test_should_match_failure_when_failure_and_match_called(self):
        """
        Contract: Result.match must call failure handler for failed result
        """
        # Given
        error = Error.domain("TEST.Error", "Test error message")
        result = Result.failure(error)
        success_handler = lambda x: f"Success: {x}"
        failure_handler = lambda e: f"Failure: {e.message}"

        # When
        matched_result = result.match(success_handler, failure_handler)

        # Then
        assert matched_result == "Failure: Test error message"

    def test_should_ensure_success_when_predicate_true(self):
        """
        Contract: Result.ensure must remain success when predicate is satisfied
        """
        # Given
        result = Result.success(10)
        predicate = lambda x: x > 5
        error = Error.validation("TEST.Validation", "Value too small")

        # When
        ensured_result = result.ensure(predicate, error)

        # Then
        assert ensured_result.is_success is True
        assert ensured_result.value == 10

    def test_should_ensure_failure_when_predicate_false(self):
        """
        Contract: Result.ensure must become failure when predicate is not satisfied
        """
        # Given
        result = Result.success(3)
        predicate = lambda x: x > 5
        error = Error.validation("TEST.Validation", "Value too small")

        # When
        ensured_result = result.ensure(predicate, error)

        # Then
        assert ensured_result.is_success is False
        assert ensured_result.error == error

    def test_should_ensure_preserve_failure_when_already_failure(self):
        """
        Contract: Result.ensure must preserve existing failure
        """
        # Given
        original_error = Error.domain("TEST.Original", "Original error")
        result = Result.failure(original_error)
        predicate = lambda x: x > 5
        new_error = Error.validation("TEST.Validation", "Value too small")

        # When
        ensured_result = result.ensure(predicate, new_error)

        # Then
        assert ensured_result.is_success is False
        assert ensured_result.error == original_error

    def test_should_combine_all_success_when_all_results_successful(self):
        """
        Contract: Result.combine must return success with all values when all results successful
        """
        # Given
        results = [
            Result.success(1),
            Result.success(2),
            Result.success(3)
        ]

        # When
        combined_result = Result.combine(results)

        # Then
        assert combined_result.is_success is True
        assert combined_result.value == [1, 2, 3]

    def test_should_combine_first_failure_when_any_result_failed(self):
        """
        Contract: Result.combine must return first failure when any result failed
        """
        # Given
        error1 = Error.domain("TEST.Error1", "First error")
        error2 = Error.domain("TEST.Error2", "Second error")
        results = [
            Result.success(1),
            Result.failure(error1),
            Result.failure(error2)
        ]

        # When
        combined_result = Result.combine(results)

        # Then
        assert combined_result.is_success is False
        assert combined_result.error == error1

    def test_should_combine_empty_list_when_no_results_provided(self):
        """
        Contract: Result.combine must return empty success when no results provided
        """
        # Given
        results: List[Result[int]] = []

        # When
        combined_result = Result.combine(results)

        # Then
        assert combined_result.is_success is True
        assert combined_result.value == []

    def test_should_chain_operations_when_multiple_maps_applied(self):
        """
        Contract: Result must support chaining multiple map operations
        """
        # Given
        result = Result.success(5)

        # When
        chained_result = result.map(lambda x: x * 2).map(lambda x: x + 1).map(str)

        # Then
        assert chained_result.is_success is True
        assert chained_result.value == "11"

    def test_should_chain_operations_when_multiple_binds_applied(self):
        """
        Contract: Result must support chaining multiple bind operations
        """
        # Given
        result = Result.success(5)

        # When
        chained_result = (result
                         .bind(lambda x: Result.success(x * 2))
                         .bind(lambda x: Result.success(x + 1))
                         .bind(lambda x: Result.success(str(x))))

        # Then
        assert chained_result.is_success is True
        assert chained_result.value == "11"

    def test_should_short_circuit_when_failure_in_chain(self):
        """
        Contract: Result must short-circuit on first failure in operation chain
        """
        # Given
        result = Result.success(5)
        error = Error.domain("TEST.Error", "Operation failed")

        # When
        chained_result = (result
                         .map(lambda x: x * 2)
                         .bind(lambda x: Result.failure(error))
                         .map(lambda x: x + 1))  # This should not execute

        # Then
        assert chained_result.is_success is False
        assert chained_result.error == error

    def test_should_handle_exception_in_map_when_mapping_function_throws(self):
        """
        Contract: Result.map must handle exceptions in mapping function gracefully
        """
        # Given
        result = Result.success(5)
        failing_mapper = lambda x: x / 0  # Division by zero

        # When
        mapped_result = result.map(failing_mapper)

        # Then
        assert mapped_result.is_success is False
        assert mapped_result.error.category == ErrorCategory.INFRASTRUCTURE

    def test_should_accept_none_value_when_creating_success_for_void_operations(self):
        """
        Contract: Result.success must accept None values for void operations (Result[None])
        """
        # Given/When
        result = Result.success(None)

        # Then
        assert result.is_success is True
        assert result.value is None

    def test_should_reject_none_error_when_creating_failure(self):
        """
        Contract: Result.failure must reject None errors
        """
        # Given/When/Then
        with pytest.raises((ValueError, TypeError)):
            Result.failure(None)

    def _create_test_result_success(self, value) -> Result:
        """
        Helper method to create successful Result instance.
        This will fail until Result is properly implemented.
        """
        # This import will fail until implementation exists
        from architecture_core.functional import Result
        return Result.success(value)

    def _create_test_result_failure(self, error: Error) -> Result:
        """
        Helper method to create failed Result instance.
        This will fail until Result is properly implemented.
        """
        # This import will fail until implementation exists
        from architecture_core.functional import Result
        return Result.failure(error)