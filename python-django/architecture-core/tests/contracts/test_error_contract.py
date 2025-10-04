"""
Contract tests for Error categorization.

These tests define the behavioral contract that all Error implementations must satisfy.
Tests are written following TDD approach and MUST FAIL before implementation.
"""

import pytest
from architecture_core.functional import Error, ErrorCategory


class TestErrorContract:
    """Contract tests for Error categorization compliance"""

    def test_should_create_domain_error_when_domain_called(self):
        """Contract: Error.domain must create domain category error"""
        # Given
        code = "DOMAIN.Error"
        message = "Domain error message"

        # When
        error = Error.domain(code, message)

        # Then
        assert error.code == code
        assert error.message == message
        assert error.category == ErrorCategory.DOMAIN

    def test_should_create_validation_error_when_validation_called(self):
        """Contract: Error.validation must create validation category error"""
        # Given
        code = "VALIDATION.Error"
        message = "Validation error message"
        metadata = {"field": "email", "value": "invalid"}

        # When
        error = Error.validation(code, message, metadata)

        # Then
        assert error.code == code
        assert error.message == message
        assert error.category == ErrorCategory.VALIDATION
        assert error.metadata == metadata

    def test_should_create_infrastructure_error_when_infrastructure_called(self):
        """Contract: Error.infrastructure must create infrastructure category error"""
        # Given
        code = "INFRASTRUCTURE.Error"
        message = "Infrastructure error message"
        cause = Exception("Root cause")

        # When
        error = Error.infrastructure(code, message, cause)

        # Then
        assert error.code == code
        assert error.message == message
        assert error.category == ErrorCategory.INFRASTRUCTURE

    def test_should_be_immutable_when_created(self):
        """Contract: Error must be immutable after creation"""
        # Given
        error = Error.domain("TEST.Error", "Test message")

        # When/Then
        try:
            error.code = "NEW.Code"
            # If assignment succeeded, verify it had no effect
            assert error.code == "TEST.Error"
        except (AttributeError, TypeError):
            # Expected for frozen dataclass
            pass