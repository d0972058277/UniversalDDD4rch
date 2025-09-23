"""
Integration tests for functional error handling patterns.

These tests verify that Result and Maybe types work correctly
in real-world scenarios with proper error composition and chaining.
"""

import pytest
from typing import List, Dict, Any
from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error, ErrorCategory


class TestFunctionalErrorHandling:
    """Integration tests for functional error handling patterns"""

    def test_should_chain_multiple_operations_when_all_succeed(self):
        """
        Test successful operation chaining

        Given: Multiple operations that all succeed
        When: Chaining operations with map and bind
        Then: Final result should be successful
        """
        # Given
        def parse_number(s: str) -> Result[int]:
            try:
                return Result.success(int(s))
            except ValueError:
                return Result.failure(Error.validation(
                    "Parse.InvalidNumber",
                    f"'{s}' is not a valid number"
                ))

        def double_number(n: int) -> Result[int]:
            return Result.success(n * 2)

        def format_result(n: int) -> Result[str]:
            return Result.success(f"Result: {n}")

        # When
        result = (parse_number("42")
                 .bind(double_number)
                 .bind(format_result))

        # Then
        assert result.is_success
        assert result.value == "Result: 84"

    def test_should_short_circuit_on_first_failure_when_chaining(self):
        """
        Test error short-circuiting in operation chains

        Given: Chain of operations where one fails
        When: Executing the chain
        Then: Should stop at first failure and preserve error
        """
        # Given
        def parse_number(s: str) -> Result[int]:
            try:
                return Result.success(int(s))
            except ValueError:
                return Result.failure(Error.validation(
                    "Parse.InvalidNumber",
                    f"'{s}' is not a valid number"
                ))

        def validate_positive(n: int) -> Result[int]:
            if n <= 0:
                return Result.failure(Error.domain(
                    "Validation.NotPositive",
                    f"Number {n} must be positive"
                ))
            return Result.success(n)

        def double_number(n: int) -> Result[int]:
            return Result.success(n * 2)

        # When - Invalid input causes early failure
        result = (parse_number("not_a_number")
                 .bind(validate_positive)
                 .bind(double_number))

        # Then
        assert result.is_failure
        assert result.error.code == "Parse.InvalidNumber"
        assert "not_a_number" in result.error.message

    def test_should_combine_results_when_all_operations_succeed(self):
        """
        Test combining multiple independent results

        Given: Multiple independent operations that succeed
        When: Combining results
        Then: All values should be collected
        """
        # Given
        def validate_email(email: str) -> Result[str]:
            if "@" in email:
                return Result.success(email)
            return Result.failure(Error.validation(
                "Email.Invalid",
                "Email must contain @ symbol"
            ))

        def validate_age(age: str) -> Result[int]:
            try:
                age_int = int(age)
                if age_int >= 0:
                    return Result.success(age_int)
                return Result.failure(Error.validation(
                    "Age.Negative",
                    "Age cannot be negative"
                ))
            except ValueError:
                return Result.failure(Error.validation(
                    "Age.Invalid",
                    "Age must be a valid number"
                ))

        def validate_name(name: str) -> Result[str]:
            if name.strip():
                return Result.success(name.strip())
            return Result.failure(Error.validation(
                "Name.Empty",
                "Name cannot be empty"
            ))

        # When
        results = [
            validate_email("user@example.com"),
            validate_age("25"),
            validate_name("John Doe")
        ]
        combined_result = Result.combine(results)

        # Then
        assert combined_result.is_success
        assert combined_result.value == ["user@example.com", 25, "John Doe"]

    def test_should_return_first_error_when_combining_failed_results(self):
        """
        Test combining results when some fail

        Given: Multiple operations where some fail
        When: Combining results
        Then: Should return first failure
        """
        # Given
        def validate_email(email: str) -> Result[str]:
            if "@" in email:
                return Result.success(email)
            return Result.failure(Error.validation(
                "Email.Invalid",
                "Email must contain @ symbol"
            ))

        def validate_age(age: str) -> Result[int]:
            try:
                return Result.success(int(age))
            except ValueError:
                return Result.failure(Error.validation(
                    "Age.Invalid",
                    "Age must be a valid number"
                ))

        # When - First validation fails
        results = [
            validate_email("invalid-email"),  # This will fail
            validate_age("25")  # This would succeed
        ]
        combined_result = Result.combine(results)

        # Then
        assert combined_result.is_failure
        assert combined_result.error.code == "Email.Invalid"

    def test_should_handle_nested_error_scenarios_with_maybe(self):
        """
        Test Maybe type error handling in nested scenarios

        Given: Nested operations using Maybe
        When: Some operations return None
        Then: Should handle gracefully with Maybe chain
        """
        # Given
        users_db = {
            "123": {"name": "John", "email": "john@example.com"},
            "456": {"name": "Jane", "email": None}  # Missing email
        }

        def find_user(user_id: str) -> Maybe[Dict[str, Any]]:
            user = users_db.get(user_id)
            return Maybe.some(user) if user else Maybe.none()

        def get_user_email(user: Dict[str, Any]) -> Maybe[str]:
            email = user.get("email")
            return Maybe.some(email) if email else Maybe.none()

        def format_email(email: str) -> Maybe[str]:
            return Maybe.some(f"<{email}>")

        # When - User exists but has no email
        result_with_no_email = (find_user("456")
                               .bind(get_user_email)
                               .bind(format_email))

        # When - User exists and has email
        result_with_email = (find_user("123")
                            .bind(get_user_email)
                            .bind(format_email))

        # When - User doesn't exist
        result_no_user = (find_user("999")
                         .bind(get_user_email)
                         .bind(format_email))

        # Then
        assert not result_with_no_email.has_value
        assert result_with_email.has_value
        assert result_with_email.value == "<john@example.com>"
        assert not result_no_user.has_value

    def test_should_convert_between_result_and_maybe_when_needed(self):
        """
        Test conversion patterns between Result and Maybe

        Given: Operations that return different types
        When: Converting between Result and Maybe
        Then: Conversions should preserve semantics
        """
        # Given
        def safe_divide(a: float, b: float) -> Result[float]:
            if b == 0:
                return Result.failure(Error.domain(
                    "Math.DivisionByZero",
                    "Cannot divide by zero"
                ))
            return Result.success(a / b)

        def result_to_maybe(result: Result[float]) -> Maybe[float]:
            return Maybe.some(result.value) if result.is_success else Maybe.none()

        def maybe_to_result(maybe: Maybe[float], error: Error) -> Result[float]:
            return Result.success(maybe.value) if maybe.has_value else Result.failure(error)

        # When - Convert successful result to maybe
        division_result = safe_divide(10, 2)
        maybe_result = result_to_maybe(division_result)

        # When - Convert failed result to maybe
        failed_division = safe_divide(10, 0)
        maybe_failed = result_to_maybe(failed_division)

        # When - Convert maybe back to result
        back_to_result = maybe_to_result(maybe_result, Error.domain("Test.Error", "Test"))

        # Then
        assert maybe_result.has_value
        assert maybe_result.value == 5.0
        assert not maybe_failed.has_value
        assert back_to_result.is_success
        assert back_to_result.value == 5.0

    def test_should_handle_complex_business_workflow_with_proper_errors(self):
        """
        Test complex business workflow with multiple error types

        Given: Complex business process with validation, domain, and infrastructure errors
        When: Processing with various error scenarios
        Then: Should handle each error type appropriately
        """
        # Given
        class OrderProcessor:
            def __init__(self):
                self.inventory = {"PROD-001": 10, "PROD-002": 5}
                self.payment_service_down = False

            def validate_order_data(self, order_data: Dict[str, Any]) -> Result[Dict[str, Any]]:
                """Validate order data structure"""
                required_fields = ["customer_id", "product_id", "quantity"]
                for field in required_fields:
                    if field not in order_data:
                        return Result.failure(Error.validation(
                            "Order.MissingField",
                            f"Missing required field: {field}",
                            {"field": field}
                        ))

                if order_data["quantity"] <= 0:
                    return Result.failure(Error.validation(
                        "Order.InvalidQuantity",
                        "Quantity must be positive",
                        {"quantity": order_data["quantity"]}
                    ))

                return Result.success(order_data)

            def check_inventory(self, product_id: str, quantity: int) -> Result[bool]:
                """Check if product is available in required quantity"""
                available = self.inventory.get(product_id, 0)
                if available < quantity:
                    return Result.failure(Error.domain(
                        "Inventory.InsufficientStock",
                        f"Only {available} items available, requested {quantity}"
                    ))
                return Result.success(True)

            def process_payment(self, amount: float) -> Result[str]:
                """Process payment (simulated)"""
                if self.payment_service_down:
                    return Result.failure(Error.infrastructure(
                        "Payment.ServiceUnavailable",
                        "Payment service is currently unavailable"
                    ))

                if amount <= 0:
                    return Result.failure(Error.domain(
                        "Payment.InvalidAmount",
                        "Payment amount must be positive"
                    ))

                return Result.success(f"PAYMENT-{int(amount * 100)}")

            def reserve_inventory(self, product_id: str, quantity: int) -> Result[None]:
                """Reserve inventory items"""
                if product_id not in self.inventory:
                    return Result.failure(Error.domain(
                        "Inventory.ProductNotFound",
                        f"Product {product_id} not found"
                    ))

                self.inventory[product_id] -= quantity
                return Result.success(None)

            def process_order(self, order_data: Dict[str, Any]) -> Result[str]:
                """Complete order processing workflow"""
                return (self.validate_order_data(order_data)
                       .bind(lambda data: self.check_inventory(data["product_id"], data["quantity"])
                             .map(lambda _: data))
                       .bind(lambda data: self.process_payment(data.get("amount", 100.0))
                             .map(lambda payment_id: (data, payment_id)))
                       .bind(lambda tuple_data: self.reserve_inventory(tuple_data[0]["product_id"], tuple_data[0]["quantity"])
                             .map(lambda _: f"ORDER-COMPLETE-{tuple_data[1]}")))

        processor = OrderProcessor()

        # When - Valid order
        valid_order = {
            "customer_id": "CUST-123",
            "product_id": "PROD-001",
            "quantity": 3,
            "amount": 150.0
        }
        success_result = processor.process_order(valid_order)

        # When - Invalid order (missing field)
        invalid_order = {
            "customer_id": "CUST-123",
            "quantity": 2
        }
        validation_error = processor.process_order(invalid_order)

        # When - Insufficient inventory
        high_quantity_order = {
            "customer_id": "CUST-456",
            "product_id": "PROD-002",
            "quantity": 10,  # Only 5 available
            "amount": 200.0
        }
        domain_error = processor.process_order(high_quantity_order)

        # When - Payment service down
        processor.payment_service_down = True
        infrastructure_error_order = {
            "customer_id": "CUST-789",
            "product_id": "PROD-001",
            "quantity": 1,
            "amount": 50.0
        }
        infrastructure_error = processor.process_order(infrastructure_error_order)

        # Then
        assert success_result.is_success
        assert "ORDER-COMPLETE-PAYMENT-15000" in success_result.value

        assert validation_error.is_failure
        assert validation_error.error.category == ErrorCategory.VALIDATION
        assert validation_error.error.code == "Order.MissingField"

        assert domain_error.is_failure
        assert domain_error.error.category == ErrorCategory.DOMAIN
        assert domain_error.error.code == "Inventory.InsufficientStock"

        assert infrastructure_error.is_failure
        assert infrastructure_error.error.category == ErrorCategory.INFRASTRUCTURE
        assert infrastructure_error.error.code == "Payment.ServiceUnavailable"

    def test_should_handle_error_recovery_patterns(self):
        """
        Test error recovery and fallback patterns

        Given: Operations that may fail with fallback options
        When: Primary operation fails
        Then: Should attempt fallback gracefully
        """
        # Given
        primary_service_down = True
        backup_service_down = False

        def call_primary_service(data: str) -> Result[str]:
            if primary_service_down:
                return Result.failure(Error.infrastructure(
                    "PrimaryService.Unavailable",
                    "Primary service is down"
                ))
            return Result.success(f"Primary: {data}")

        def call_backup_service(data: str) -> Result[str]:
            if backup_service_down:
                return Result.failure(Error.infrastructure(
                    "BackupService.Unavailable",
                    "Backup service is down"
                ))
            return Result.success(f"Backup: {data}")

        def call_with_fallback(data: str) -> Result[str]:
            primary_result = call_primary_service(data)
            if primary_result.is_success:
                return primary_result

            # Fallback to backup service
            backup_result = call_backup_service(data)
            if backup_result.is_success:
                return backup_result

            # Both services failed
            return Result.failure(Error.infrastructure(
                "AllServices.Unavailable",
                "Both primary and backup services are unavailable"
            ))

        # When - Primary fails, backup succeeds
        result_with_fallback = call_with_fallback("test-data")

        # When - Both services fail
        backup_service_down = True
        result_all_failed = call_with_fallback("test-data")

        # Then
        assert result_with_fallback.is_success
        assert result_with_fallback.value == "Backup: test-data"

        assert result_all_failed.is_failure
        assert result_all_failed.error.code == "AllServices.Unavailable"