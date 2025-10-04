"""
Property-based tests for Maybe monadic laws.

These tests verify that the Maybe type satisfies the mathematical laws
required for a proper monad implementation.
"""

import pytest
from typing import Callable, TypeVar
from hypothesis import given, strategies as st
from architecture_core.functional.maybe import Maybe

T = TypeVar('T')
U = TypeVar('U')
V = TypeVar('V')


class TestMaybeMonadicLaws:
    """Test class for Maybe monadic laws verification"""

    @given(st.integers())
    def test_should_satisfy_left_identity_law_when_binding_function(self, value: int):
        """
        Test Maybe left identity law: Maybe.some(a).bind(f) == f(a)

        Given: A value and a monadic function
        When: Applying left identity law
        Then: Both sides should be equal
        """
        # Given
        def f(x: int) -> Maybe[str]:
            return Maybe.some(str(x * 2))

        # When
        left_side = Maybe.some(value).bind(f)
        right_side = f(value)

        # Then
        assert left_side.has_value == right_side.has_value
        if left_side.has_value and right_side.has_value:
            assert left_side.value == right_side.value

    @given(st.one_of(st.integers(), st.none()))
    def test_should_satisfy_right_identity_law_when_binding_some(self, value):
        """
        Test Maybe right identity law: m.bind(Maybe.some) == m

        Given: A Maybe instance
        When: Binding with Maybe.some
        Then: Result should equal original Maybe
        """
        # Given
        maybe_value = Maybe.some(value) if value is not None else Maybe.none()

        # When
        result = maybe_value.bind(Maybe.some)

        # Then
        assert result.has_value == maybe_value.has_value
        if result.has_value and maybe_value.has_value:
            assert result.value == maybe_value.value

    @given(st.integers())
    def test_should_satisfy_associativity_law_when_chaining_binds(self, value: int):
        """
        Test Maybe associativity law: m.bind(f).bind(g) == m.bind(lambda x: f(x).bind(g))

        Given: A Maybe instance and two monadic functions
        When: Applying associativity law
        Then: Both evaluation orders should be equal
        """
        # Given
        def f(x: int) -> Maybe[int]:
            return Maybe.some(x * 2) if x >= 0 else Maybe.none()

        def g(x: int) -> Maybe[str]:
            return Maybe.some(f"result_{x}") if x < 1000 else Maybe.none()

        maybe_value = Maybe.some(value)

        # When
        left_side = maybe_value.bind(f).bind(g)
        right_side = maybe_value.bind(lambda x: f(x).bind(g))

        # Then
        assert left_side.has_value == right_side.has_value
        if left_side.has_value and right_side.has_value:
            assert left_side.value == right_side.value

    @given(st.integers())
    def test_should_satisfy_left_identity_with_none_result(self, value: int):
        """
        Test Maybe left identity law with function that returns None

        Given: A value and a function that returns None
        When: Applying left identity law
        Then: Both sides should be None
        """
        # Given
        def f(x: int) -> Maybe[str]:
            return Maybe.none()  # Always returns None

        # When
        left_side = Maybe.some(value).bind(f)
        right_side = f(value)

        # Then
        assert not left_side.has_value
        assert not right_side.has_value

    def test_should_satisfy_right_identity_law_with_none(self):
        """
        Test Maybe right identity law with None value

        Given: A None Maybe
        When: Binding with Maybe.some
        Then: Result should still be None
        """
        # Given
        none_maybe = Maybe.none()

        # When
        result = none_maybe.bind(Maybe.some)

        # Then
        assert not result.has_value
        assert not none_maybe.has_value

    @given(st.integers())
    def test_should_satisfy_associativity_with_none_in_chain(self, value: int):
        """
        Test Maybe associativity law when None appears in the chain

        Given: Functions that may return None
        When: Applying associativity law
        Then: Both sides should be None
        """
        # Given
        def f(x: int) -> Maybe[int]:
            return Maybe.none()  # Always returns None

        def g(x: int) -> Maybe[str]:
            return Maybe.some(f"result_{x}")

        maybe_value = Maybe.some(value)

        # When
        left_side = maybe_value.bind(f).bind(g)
        right_side = maybe_value.bind(lambda x: f(x).bind(g))

        # Then
        assert not left_side.has_value
        assert not right_side.has_value

    @given(st.text())
    def test_should_satisfy_laws_with_different_types(self, text_value: str):
        """
        Test monadic laws work with different value types

        Given: String values and type-transforming functions
        When: Applying monadic laws
        Then: Laws should hold for different types
        """
        # Given
        def f(s: str) -> Maybe[int]:
            return Maybe.some(len(s)) if s else Maybe.none()

        def g(n: int) -> Maybe[bool]:
            return Maybe.some(n > 5)

        maybe_text = Maybe.some(text_value)

        # When - Test associativity with type changes
        left_side = maybe_text.bind(f).bind(g)
        right_side = maybe_text.bind(lambda x: f(x).bind(g))

        # Then
        assert left_side.has_value == right_side.has_value
        if left_side.has_value and right_side.has_value:
            assert left_side.value == right_side.value