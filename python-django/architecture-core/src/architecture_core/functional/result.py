"""
Result[T] monadic type for functional error handling.

This module provides the Result type for expressing operations that can
succeed with a value or fail with an error, enabling functional composition
and eliminating the need for exceptions in business logic.
"""

from typing import TypeVar, Generic, Callable, List, Union, Any
from architecture_core.functional.error import Error, ErrorCategory

T = TypeVar('T')
U = TypeVar('U')


class Result(Generic[T]):
    """
    Represents the result of an operation that can either succeed with a value or fail with an error.

    Result enables functional error handling by making success and failure explicit,
    composable through monadic operations (map, bind), and eliminates the need
    for exception handling in business logic.

    The Result type satisfies the monad laws:
    - Left Identity: Result.success(a).bind(f) == f(a)
    - Right Identity: m.bind(Result.success) == m
    - Associativity: m.bind(f).bind(g) == m.bind(lambda x: f(x).bind(g))

    Examples:
        # Basic usage
        result = Result.success(42)
        if result.is_success:
            print(f"Value: {result.value}")

        # Functional composition
        result = (Result.success(5)
                 .map(lambda x: x * 2)
                 .bind(lambda x: Result.success(str(x)))
                 .ensure(lambda x: len(x) > 0, Error.validation("Empty", "Result is empty")))

        # Pattern matching
        message = result.match(
            on_success=lambda x: f"Success: {x}",
            on_failure=lambda e: f"Error: {e.message}"
        )
    """

    def __init__(self, value: T = None, error: Error = None, is_success: bool = True) -> None:
        """
        Private constructor. Use Result.success() or Result.failure() instead.
        """
        self._value = value
        self._error = error
        self._is_success = is_success

    @classmethod
    def success(cls, value: T) -> 'Result[T]':
        """
        Create successful result with value.

        Args:
            value: The success value (None allowed for void operations)

        Returns:
            Result representing successful operation
        """
        return cls(value=value, is_success=True)

    @classmethod
    def failure(cls, error: Error) -> 'Result[T]':
        """
        Create failed result with error.

        Args:
            error: The error information (cannot be None)

        Returns:
            Result representing failed operation

        Raises:
            ValueError: If error is None
        """
        if error is None:
            raise ValueError("Error cannot be None")

        return cls(error=error, is_success=False)

    @property
    def is_success(self) -> bool:
        """Check if result represents successful operation"""
        return self._is_success

    @property
    def is_failure(self) -> bool:
        """Check if result represents failed operation"""
        return not self._is_success

    @property
    def value(self) -> T:
        """
        Get success value.

        Returns:
            The success value

        Raises:
            RuntimeError: If result represents failure
        """
        if self.is_failure:
            raise RuntimeError("Cannot access value on failed result")
        return self._value

    @property
    def error(self) -> Error:
        """
        Get error information.

        Returns:
            The error information

        Raises:
            RuntimeError: If result represents success
        """
        if self.is_success:
            raise RuntimeError("Cannot access error on successful result")
        return self._error

    def map(self, func: Callable[[T], U]) -> 'Result[U]':
        """
        Transform success value using mapping function.

        If result is successful, applies the function to the value and returns
        a new Result with the transformed value. If result is failed, returns
        the failure without applying the function.

        Args:
            func: Function to transform success value

        Returns:
            Result with transformed value or original failure
        """
        if self.is_failure:
            return Result.failure(self.error)

        try:
            mapped_value = func(self.value)
            if mapped_value is None:
                return Result.failure(Error.infrastructure(
                    "Result.Map.NullResult",
                    "Mapping function returned None"
                ))
            return Result.success(mapped_value)
        except Exception as ex:
            return Result.failure(Error.infrastructure(
                "Result.Map.Exception",
                f"Mapping function threw exception: {str(ex)}",
                ex
            ))

    def bind(self, func: Callable[[T], 'Result[U]']) -> 'Result[U]':
        """
        Apply monadic bind operation (flatMap).

        If result is successful, applies the function to the value and returns
        the resulting Result. If result is failed, returns the failure without
        applying the function.

        Args:
            func: Function that takes success value and returns Result

        Returns:
            Result from applying function or original failure
        """
        if self.is_failure:
            return Result.failure(self.error)

        try:
            return func(self.value)
        except Exception as ex:
            return Result.failure(Error.infrastructure(
                "Result.Bind.Exception",
                f"Binding function threw exception: {str(ex)}",
                ex
            ))

    def match(self, on_success: Callable[[T], U], on_failure: Callable[[Error], U]) -> U:
        """
        Pattern matching for result handling.

        Applies the appropriate handler based on result state.

        Args:
            on_success: Function to handle success case
            on_failure: Function to handle failure case

        Returns:
            Result of applying the appropriate handler
        """
        if self.is_success:
            return on_success(self.value)
        else:
            return on_failure(self.error)

    def ensure(self, predicate: Callable[[T], bool], error: Error) -> 'Result[T]':
        """
        Ensure predicate holds for success value.

        If result is successful and predicate returns True, returns the original
        result. If predicate returns False, returns failure with provided error.
        If result is already failed, returns original failure.

        Args:
            predicate: Function to test success value
            error: Error to return if predicate fails

        Returns:
            Original result if predicate succeeds, failure otherwise
        """
        if self.is_failure:
            return self

        try:
            if predicate(self.value):
                return self
            else:
                return Result.failure(error)
        except Exception as ex:
            return Result.failure(Error.infrastructure(
                "Result.Ensure.Exception",
                f"Predicate function threw exception: {str(ex)}",
                ex
            ))

    @staticmethod
    def combine(results: List['Result[T]']) -> 'Result[List[T]]':
        """
        Combine multiple results into single result.

        If all results are successful, returns success with list of all values.
        If any result is failed, returns the first failure encountered.

        Args:
            results: List of results to combine

        Returns:
            Combined result with all values or first failure
        """
        if not results:
            return Result.success([])

        values = []
        for result in results:
            if result.is_failure:
                return Result.failure(result.error)
            values.append(result.value)

        return Result.success(values)

    def __eq__(self, other: object) -> bool:
        """Equality comparison for Result instances"""
        if not isinstance(other, Result):
            return False

        if self.is_success != other.is_success:
            return False

        if self.is_success:
            return self.value == other.value
        else:
            return self.error == other.error

    def __hash__(self) -> int:
        """Hash code for Result instances"""
        if self.is_success:
            return hash(("success", self.value))
        else:
            return hash(("failure", self.error))

    def __str__(self) -> str:
        """String representation for debugging"""
        if self.is_success:
            return f"Result.Success({self.value})"
        else:
            return f"Result.Failure({self.error})"

    def __repr__(self) -> str:
        """Detailed string representation"""
        return self.__str__()