"""
Maybe[T] optional type for safe value handling.

This module provides the Maybe type for expressing optional values that may
or may not be present, enabling safe navigation and eliminating null reference errors.
"""

from typing import TypeVar, Generic, Callable, Optional, Any
from architecture_core.functional.error import Error

T = TypeVar('T')
U = TypeVar('U')


class Maybe(Generic[T]):
    """
    Represents an optional value that may or may not be present.

    Maybe eliminates null reference errors by making the absence of values explicit
    and providing safe operations for value access and transformation.

    The Maybe type satisfies the monad laws:
    - Left Identity: Maybe.some(a).bind(f) == f(a)
    - Right Identity: m.bind(Maybe.some) == m
    - Associativity: m.bind(f).bind(g) == m.bind(lambda x: f(x).bind(g))

    Examples:
        # Basic usage
        maybe = Maybe.some("hello")
        if maybe.has_value:
            print(f"Value: {maybe.value}")

        # Safe navigation
        result = (Maybe.some("hello")
                 .map(str.upper)
                 .map(len)
                 .or_else(0))

        # Filtering
        positive = Maybe.some(-5).filter(lambda x: x > 0)  # Returns None
    """

    _NONE_INSTANCE = None

    def __init__(self, value: T = None, has_value: bool = False) -> None:
        """
        Private constructor. Use Maybe.some() or Maybe.none() instead.
        """
        self._value = value
        self._has_value = has_value

    @classmethod
    def some(cls, value: T) -> 'Maybe[T]':
        """
        Create Maybe with value.

        Args:
            value: The value to wrap (cannot be None)

        Returns:
            Maybe containing the value

        Raises:
            ValueError: If value is None
        """
        if value is None:
            raise ValueError("Value cannot be None")

        return cls(value=value, has_value=True)

    @classmethod
    def none(cls) -> 'Maybe[T]':
        """
        Create Maybe representing absence of value.

        Returns:
            Maybe representing no value
        """
        # Use singleton pattern for None instances to save memory
        if cls._NONE_INSTANCE is None:
            cls._NONE_INSTANCE = cls(has_value=False)
        return cls._NONE_INSTANCE

    @property
    def has_value(self) -> bool:
        """Check if Maybe contains a value"""
        return self._has_value

    @property
    def value(self) -> T:
        """
        Get contained value.

        Returns:
            The contained value

        Raises:
            RuntimeError: If Maybe does not contain a value
        """
        if not self.has_value:
            raise RuntimeError("Cannot access value on Maybe.none()")
        return self._value

    def map(self, func: Callable[[T], U]) -> 'Maybe[U]':
        """
        Transform contained value using mapping function.

        If Maybe contains a value, applies the function to the value and returns
        a new Maybe with the transformed value. If Maybe is None, returns None
        without applying the function.

        Args:
            func: Function to transform the value

        Returns:
            Maybe with transformed value or None
        """
        if not self.has_value:
            return Maybe.none()

        try:
            mapped_value = func(self.value)
            if mapped_value is None:
                return Maybe.none()
            return Maybe.some(mapped_value)
        except Exception:
            # Map operations on Maybe typically absorb exceptions and return None
            return Maybe.none()

    def bind(self, func: Callable[[T], 'Maybe[U]']) -> 'Maybe[U]':
        """
        Apply monadic bind operation (flatMap).

        If Maybe contains a value, applies the function to the value and returns
        the resulting Maybe. If Maybe is None, returns None without applying
        the function.

        Args:
            func: Function that takes a value and returns Maybe

        Returns:
            Maybe from applying function or None
        """
        if not self.has_value:
            return Maybe.none()

        try:
            return func(self.value)
        except Exception:
            # Bind operations on Maybe typically absorb exceptions and return None
            return Maybe.none()

    def or_else(self, default: T) -> T:
        """
        Get value or return default.

        Args:
            default: Value to return if Maybe is None

        Returns:
            Contained value or default
        """
        if self.has_value:
            return self.value
        return default

    def or_else_get(self, func: Callable[[], T]) -> T:
        """
        Get value or call function for default.

        Args:
            func: Function to call for default value

        Returns:
            Contained value or result of calling function
        """
        if self.has_value:
            return self.value
        return func()

    def filter(self, predicate: Callable[[T], bool]) -> 'Maybe[T]':
        """
        Filter value by predicate.

        If Maybe contains a value and predicate returns True, returns the original
        Maybe. If predicate returns False or Maybe is None, returns None.

        Args:
            predicate: Function to test the value

        Returns:
            Original Maybe if predicate succeeds, None otherwise
        """
        if not self.has_value:
            return Maybe.none()

        try:
            if predicate(self.value):
                return self
            else:
                return Maybe.none()
        except Exception:
            # Filter operations typically absorb exceptions and return None
            return Maybe.none()

    @staticmethod
    def from_optional(value: Optional[T]) -> 'Maybe[T]':
        """
        Create Maybe from Optional value.

        Args:
            value: Optional value that may be None

        Returns:
            Maybe.some(value) if value is not None, Maybe.none() otherwise
        """
        if value is None:
            return Maybe.none()
        return Maybe.some(value)

    def to_result(self, error: Error) -> 'Result[T]':
        """
        Convert Maybe to Result.

        Args:
            error: Error to use if Maybe is None

        Returns:
            Result.success(value) if has value, Result.failure(error) otherwise
        """
        from architecture_core.functional.result import Result
        if self.has_value:
            return Result.success(self.value)
        return Result.failure(error)

    def __eq__(self, other: object) -> bool:
        """Equality comparison for Maybe instances"""
        if not isinstance(other, Maybe):
            return False

        if self.has_value != other.has_value:
            return False

        if self.has_value:
            return self.value == other.value

        return True  # Both are None

    def __hash__(self) -> int:
        """Hash code for Maybe instances"""
        if self.has_value:
            return hash(("some", self.value))
        else:
            return hash(("none",))

    def __str__(self) -> str:
        """String representation for debugging"""
        if self.has_value:
            return f"Maybe.Some({self.value})"
        else:
            return "Maybe.None"

    def __repr__(self) -> str:
        """Detailed string representation"""
        return self.__str__()