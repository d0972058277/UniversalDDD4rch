"""
Example tests demonstrating functional programming patterns with Result and Maybe.
Shows proper usage of monadic operations and error handling.
"""

import pytest
from decimal import Decimal

from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error, ErrorCategory

from examples.order_domain.identifiers import OrderId, CustomerId, ProductId
from examples.order_domain.value_objects import Money, Address, PersonName, Quantity
from examples.order_domain.aggregates import Order
from examples.order_domain.repositories import InMemoryOrderRepository


class TestFunctionalUsage:
    """Test cases demonstrating functional programming patterns."""

    def test_should_chain_result_operations_successfully_when_all_succeed(self):
        """Test successful Result chaining with map operations."""
        # Given
        initial_value = 10

        # When - Chain multiple map operations
        result = (Result.success(initial_value)
                 .map(lambda x: x * 2)        # 10 -> 20
                 .map(lambda x: x + 5)        # 20 -> 25
                 .map(lambda x: str(x)))      # 25 -> "25"

        # Then
        assert result.is_success
        assert result.value == "25"

    def test_should_stop_chaining_when_result_fails(self):
        """Test Result chaining stops at first failure."""
        # Given
        def divide_by_zero(x):
            if x == 0:
                raise ValueError("Division by zero")
            return 10 / x

        # When - Chain operations with one that fails
        result = (Result.success(5)
                 .map(lambda x: x - 5)        # 5 -> 0
                 .map(divide_by_zero)         # Should fail here
                 .map(lambda x: x * 2))       # Should not execute

        # Then
        assert result.is_failure
        assert "Division by zero" in result.error.message

    def test_should_use_bind_for_result_returning_operations(self):
        """Test Result bind operation for monadic composition."""
        # Given
        def parse_positive_int(s: str) -> Result[int]:
            try:
                value = int(s)
                if value <= 0:
                    return Result.failure(Error.validation(
                        "Parse.NotPositive",
                        "Value must be positive",
                        {"value": value}
                    ))
                return Result.success(value)
            except ValueError:
                return Result.failure(Error.validation(
                    "Parse.InvalidFormat",
                    f"Cannot parse '{s}' as integer"
                ))

        def double_if_even(n: int) -> Result[int]:
            if n % 2 == 0:
                return Result.success(n * 2)
            return Result.failure(Error.domain(
                "Math.NotEven",
                "Value must be even for doubling"
            ))

        # When - Bind operations that return Results
        result = (Result.success("24")
                 .bind(parse_positive_int)    # "24" -> Result(24)
                 .bind(double_if_even))       # 24 -> Result(48)

        # Then
        assert result.is_success
        assert result.value == 48

    def test_should_fail_bind_chain_at_first_error(self):
        """Test bind chain failure propagation."""
        # Given
        def parse_positive_int(s: str) -> Result[int]:
            try:
                value = int(s)
                if value <= 0:
                    return Result.failure(Error.validation(
                        "Parse.NotPositive",
                        "Value must be positive"
                    ))
                return Result.success(value)
            except ValueError:
                return Result.failure(Error.validation(
                    "Parse.InvalidFormat",
                    f"Cannot parse '{s}' as integer"
                ))

        def double_if_even(n: int) -> Result[int]:
            if n % 2 == 0:
                return Result.success(n * 2)
            return Result.failure(Error.domain(
                "Math.NotEven",
                "Value must be even for doubling"
            ))

        # When - Bind with odd number (should fail at double_if_even)
        result = (Result.success("15")
                 .bind(parse_positive_int)    # "15" -> Result(15)
                 .bind(double_if_even))       # 15 -> Failure (odd number)

        # Then
        assert result.is_failure
        assert result.error.code == "Math.NotEven"

    def test_should_use_match_for_result_pattern_matching(self):
        """Test Result match operation for pattern matching."""
        # Given
        def process_value(value: int) -> Result[str]:
            if value < 0:
                return Result.failure(Error.validation(
                    "Process.NegativeValue",
                    "Value cannot be negative"
                ))
            return Result.success(f"Processed: {value}")

        success_result = process_value(42)
        failure_result = process_value(-1)

        # When & Then - Match successful result
        success_message = success_result.match(
            on_success=lambda v: f"Success: {v}",
            on_failure=lambda e: f"Error: {e.message}"
        )
        assert success_message == "Success: Processed: 42"

        # When & Then - Match failed result
        failure_message = failure_result.match(
            on_success=lambda v: f"Success: {v}",
            on_failure=lambda e: f"Error: {e.message}"
        )
        assert failure_message == "Error: Value cannot be negative"

    def test_should_combine_multiple_results_successfully(self):
        """Test combining multiple Results into single Result."""
        # Given
        result1 = Result.success(10)
        result2 = Result.success(20)
        result3 = Result.success(30)

        # When
        combined = Result.combine([result1, result2, result3])

        # Then
        assert combined.is_success
        assert combined.value == [10, 20, 30]

    def test_should_fail_combine_when_any_result_fails(self):
        """Test combining Results fails if any input fails."""
        # Given
        result1 = Result.success(10)
        result2 = Result.failure(Error.domain("Test.Failed", "Something went wrong"))
        result3 = Result.success(30)

        # When
        combined = Result.combine([result1, result2, result3])

        # Then
        assert combined.is_failure
        assert combined.error.code == "Test.Failed"

    def test_should_chain_maybe_operations_successfully_when_values_present(self):
        """Test successful Maybe chaining."""
        # Given
        initial_value = "42"

        # When - Chain Maybe operations
        result = (Maybe.some(initial_value)
                 .map(lambda s: int(s))       # "42" -> 42
                 .map(lambda n: n * 2)        # 42 -> 84
                 .map(lambda n: f"Result: {n}"))  # 84 -> "Result: 84"

        # Then
        assert result.has_value
        assert result.value == "Result: 84"

    def test_should_stop_maybe_chain_at_none_value(self):
        """Test Maybe chaining stops at None."""
        # Given
        def parse_int_safe(s: str) -> Maybe[int]:
            try:
                return Maybe.some(int(s))
            except ValueError:
                return Maybe.none()

        # When - Chain with invalid input
        result = (Maybe.some("not_a_number")
                 .bind(parse_int_safe)        # Should return None
                 .map(lambda n: n * 2)        # Should not execute
                 .map(lambda n: f"Result: {n}"))  # Should not execute

        # Then
        assert not result.has_value

    def test_should_use_or_else_for_maybe_default_values(self):
        """Test Maybe or_else for default values."""
        # Given
        some_value = Maybe.some(42)
        none_value = Maybe.none()

        # When & Then
        assert some_value.or_else(100) == 42
        assert none_value.or_else(100) == 100

    def test_should_filter_maybe_values_with_predicate(self):
        """Test Maybe filter operation."""
        # Given
        even_number = Maybe.some(42)
        odd_number = Maybe.some(43)
        none_value = Maybe.none()

        # When
        filtered_even = even_number.filter(lambda x: x % 2 == 0)
        filtered_odd = odd_number.filter(lambda x: x % 2 == 0)
        filtered_none = none_value.filter(lambda x: x % 2 == 0)

        # Then
        assert filtered_even.has_value
        assert filtered_even.value == 42

        assert not filtered_odd.has_value

        assert not filtered_none.has_value

    def test_should_demonstrate_order_workflow_with_functional_composition(self):
        """Test complete order workflow using functional composition."""
        # Given
        repository = InMemoryOrderRepository()

        async def create_order_workflow():
            # Create order
            order_id = OrderId.from_string("ORD-123456")
            customer_id = CustomerId.from_string("CUST-ABC123")
            customer_name = PersonName("Jane", "Smith")
            billing_address = Address.create_us_address(
                "456 Oak Ave", "Test City", "TX", "54321"
            )

            order = Order(order_id, customer_id, customer_name, billing_address)

            # Add order line with functional error handling
            add_line_result = order.add_order_line(
                ProductId.from_string("PROD-TEST001"),
                Quantity.pieces(3),
                Money.usd("15.99")
            )

            # Chain operations using Result
            final_result = (add_line_result
                           .bind(lambda _: order.confirm())
                           .bind(lambda _: repository.add_async(order)))

            return await final_result if hasattr(final_result, '__await__') else final_result

        # When
        result = create_order_workflow()

        # Then
        if hasattr(result, '__await__'):
            # Handle async result
            import asyncio
            actual_result = asyncio.run(result)
        else:
            actual_result = result

        assert actual_result.is_success

    def test_should_handle_complex_error_scenarios_functionally(self):
        """Test complex error handling using functional patterns."""
        # Given
        def validate_order_data(data: dict) -> Result[dict]:
            if not data.get('customer_id'):
                return Result.failure(Error.validation(
                    "Order.MissingCustomer",
                    "Customer ID is required"
                ))
            if not data.get('amount') or data['amount'] <= 0:
                return Result.failure(Error.validation(
                    "Order.InvalidAmount",
                    "Amount must be positive",
                    {"amount": data.get('amount')}
                ))
            return Result.success(data)

        def create_money(data: dict) -> Result[Money]:
            try:
                return Result.success(Money.usd(str(data['amount'])))
            except Exception as e:
                return Result.failure(Error.domain(
                    "Order.InvalidMoney",
                    f"Cannot create money: {str(e)}"
                ))

        def check_credit_limit(money: Money) -> Result[Money]:
            if money.amount > Decimal('1000.00'):
                return Result.failure(Error.domain(
                    "Order.ExceedsCreditLimit",
                    "Order exceeds credit limit"
                ))
            return Result.success(money)

        # Valid data workflow
        valid_data = {"customer_id": "CUST-123", "amount": 150.00}
        valid_result = (Result.success(valid_data)
                       .bind(validate_order_data)
                       .bind(create_money)
                       .bind(check_credit_limit))

        assert valid_result.is_success
        assert valid_result.value.amount == Decimal('150.00')

        # Invalid data workflow - missing customer
        invalid_data = {"amount": 150.00}
        invalid_result = (Result.success(invalid_data)
                         .bind(validate_order_data)
                         .bind(create_money)
                         .bind(check_credit_limit))

        assert invalid_result.is_failure
        assert invalid_result.error.code == "Order.MissingCustomer"

        # Credit limit exceeded workflow
        excessive_data = {"customer_id": "CUST-123", "amount": 1500.00}
        excessive_result = (Result.success(excessive_data)
                           .bind(validate_order_data)
                           .bind(create_money)
                           .bind(check_credit_limit))

        assert excessive_result.is_failure
        assert excessive_result.error.code == "Order.ExceedsCreditLimit"

    def test_should_use_ensure_for_conditional_validation(self):
        """Test Result ensure operation for conditional validation."""
        # Given
        def create_order_total(amount: Decimal) -> Result[Money]:
            return Result.success(Money.usd(str(amount)))

        # When & Then - Valid amount
        valid_result = (create_order_total(Decimal('50.00'))
                       .ensure(
                           lambda money: money.amount >= Decimal('10.00'),
                           Error.validation("Order.BelowMinimum", "Order below minimum amount")
                       ))

        assert valid_result.is_success

        # When & Then - Invalid amount
        invalid_result = (create_order_total(Decimal('5.00'))
                         .ensure(
                             lambda money: money.amount >= Decimal('10.00'),
                             Error.validation("Order.BelowMinimum", "Order below minimum amount")
                         ))

        assert invalid_result.is_failure
        assert invalid_result.error.code == "Order.BelowMinimum"

    def test_should_convert_between_optional_and_maybe(self):
        """Test conversion between Optional and Maybe types."""
        # Given
        from typing import Optional

        def get_optional_value(has_value: bool) -> Optional[str]:
            return "test_value" if has_value else None

        # When & Then - Some value
        maybe_some = Maybe.from_optional(get_optional_value(True))
        assert maybe_some.has_value
        assert maybe_some.value == "test_value"

        # When & Then - None value
        maybe_none = Maybe.from_optional(get_optional_value(False))
        assert not maybe_none.has_value

    def test_should_use_or_else_get_for_lazy_defaults(self):
        """Test Maybe or_else_get for lazy evaluation of defaults."""
        # Given
        expensive_computation_called = False

        def expensive_computation():
            nonlocal expensive_computation_called
            expensive_computation_called = True
            return "expensive_result"

        some_value = Maybe.some("existing_value")
        none_value = Maybe.none()

        # When & Then - Some value (should not call expensive computation)
        result1 = some_value.or_else_get(expensive_computation)
        assert result1 == "existing_value"
        assert not expensive_computation_called

        # When & Then - None value (should call expensive computation)
        result2 = none_value.or_else_get(expensive_computation)
        assert result2 == "expensive_result"
        assert expensive_computation_called

    def test_should_demonstrate_repository_patterns_with_maybe(self):
        """Test repository patterns using Maybe for optional results."""
        # Given
        repository = InMemoryOrderRepository()

        async def repository_workflow():
            # Try to get non-existent order
            missing_order = await repository.get_by_id_async(
                OrderId.from_string("ORD-999999")
            )

            # Use Maybe operations
            result = missing_order.map(lambda order: order.total_amount.amount).or_else(Decimal('0'))

            return result

        # When
        import asyncio
        result = asyncio.run(repository_workflow())

        # Then
        assert result == Decimal('0')