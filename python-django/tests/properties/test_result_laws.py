"""
Property-based tests for Result monadic laws.

These tests verify that Result satisfies mathematical monadic laws using property-based testing.
Tests MUST FAIL before implementation.
"""

import pytest
from hypothesis import given, strategies as st
from architecture_core.functional import Result, Error


class TestResultMonadicLaws:
    """Property-based tests for Result monadic law compliance"""

    @given(st.integers())
    def test_should_satisfy_left_identity_law_when_binding_function(self, value):
        """Left Identity Law: Result.success(a).bind(f) == f(a)"""
        # Given
        def f(x): return Result.success(x * 2)

        # When
        left_side = Result.success(value).bind(f)
        right_side = f(value)

        # Then
        assert left_side.is_success == right_side.is_success
        if left_side.is_success:
            assert left_side.value == right_side.value

    @given(st.integers())
    def test_should_satisfy_right_identity_law_when_binding_success(self, value):
        """Right Identity Law: m.bind(Result.success) == m"""
        # Given
        m = Result.success(value)

        # When
        bound_result = m.bind(Result.success)

        # Then
        assert bound_result.is_success == m.is_success
        assert bound_result.value == m.value

    @given(st.integers())
    def test_should_satisfy_associativity_law_when_chaining_binds(self, value):
        """Associativity Law: m.bind(f).bind(g) == m.bind(lambda x: f(x).bind(g))"""
        # Given
        m = Result.success(value)
        def f(x): return Result.success(x * 2)
        def g(x): return Result.success(x + 1)

        # When
        left_side = m.bind(f).bind(g)
        right_side = m.bind(lambda x: f(x).bind(g))

        # Then
        assert left_side.is_success == right_side.is_success
        if left_side.is_success:
            assert left_side.value == right_side.value