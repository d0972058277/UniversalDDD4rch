"""
Error categorization and structured error handling.

This module provides comprehensive error classification and structured error
information for functional programming patterns.
"""

from typing import Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, field


class ErrorCategory(Enum):
    """
    Categorizes errors by their domain and handling strategy.

    Each category represents a different type of failure that requires
    different handling approaches:

    - DOMAIN: Business logic violations (user-correctable)
    - VALIDATION: Input validation failures (user-correctable)
    - INFRASTRUCTURE: System/external failures (retry-able)
    - CONCURRENCY: Optimistic concurrency conflicts (retry-able)
    - SECURITY: Security violations (audit-able)
    """

    DOMAIN = "Domain"
    VALIDATION = "Validation"
    INFRASTRUCTURE = "Infrastructure"
    CONCURRENCY = "Concurrency"
    SECURITY = "Security"

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Error:
    """
    Structured error information with categorization and metadata.

    Errors are immutable objects that capture comprehensive information
    about failures including business context, technical details, and
    operational metadata for debugging and monitoring.

    Attributes:
        code: Unique error code for programmatic handling
        message: Human-readable error description
        category: Error category for handling strategy
        metadata: Additional context and debugging information

    Examples:
        # Domain error
        error = Error.domain("Order.InsufficientInventory", "Not enough items in stock")

        # Validation error with metadata
        error = Error.validation(
            "User.InvalidEmail",
            "Email format is invalid",
            {"field": "email", "value": "invalid-email", "pattern": r"^[^@]+@[^@]+\.[^@]+$"}
        )

        # Infrastructure error with cause
        error = Error.infrastructure(
            "Database.ConnectionFailed",
            "Failed to connect to database",
            Exception("Connection timeout")
        )
    """

    code: str
    message: str
    category: ErrorCategory
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate error data after initialization"""
        if not self.code:
            raise ValueError("Error code cannot be empty")

        if not self.message:
            raise ValueError("Error message cannot be empty")

        if not isinstance(self.category, ErrorCategory):
            raise TypeError("Error category must be an ErrorCategory enum value")

        # Ensure metadata is immutable by converting to frozen dict equivalent
        if self.metadata and not isinstance(self.metadata, dict):
            raise TypeError("Error metadata must be a dictionary")

    @classmethod
    def domain(cls, code: str, message: str) -> 'Error':
        """
        Create domain error for business rule violations.

        Domain errors represent violations of business invariants or rules.
        They are typically user-correctable by changing business data or workflow.

        Args:
            code: Unique error code (e.g., "Order.InsufficientInventory")
            message: Human-readable error description

        Returns:
            Error with DOMAIN category
        """
        return cls(code=code, message=message, category=ErrorCategory.DOMAIN)

    @classmethod
    def validation(cls, code: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> 'Error':
        """
        Create validation error for input validation failures.

        Validation errors represent failures in input validation or constraint checking.
        They are user-correctable by providing valid input data.

        Args:
            code: Unique error code (e.g., "User.InvalidEmail")
            message: Human-readable error description
            metadata: Additional context (field names, patterns, constraints)

        Returns:
            Error with VALIDATION category
        """
        return cls(
            code=code,
            message=message,
            category=ErrorCategory.VALIDATION,
            metadata=metadata or {}
        )

    @classmethod
    def infrastructure(cls, code: str, message: str, cause: Optional[Exception] = None) -> 'Error':
        """
        Create infrastructure error for system/external failures.

        Infrastructure errors represent failures in external systems, network,
        database, or other infrastructure components. They are typically retry-able.

        Args:
            code: Unique error code (e.g., "Database.ConnectionFailed")
            message: Human-readable error description
            cause: The underlying exception that caused this error

        Returns:
            Error with INFRASTRUCTURE category
        """
        metadata = {}
        if cause:
            metadata.update({
                "exception_type": type(cause).__name__,
                "exception_message": str(cause),
                "exception_args": cause.args
            })

        return cls(
            code=code,
            message=message,
            category=ErrorCategory.INFRASTRUCTURE,
            metadata=metadata
        )

    @classmethod
    def concurrency(cls, code: str, message: str) -> 'Error':
        """
        Create concurrency error for optimistic locking conflicts.

        Concurrency errors represent conflicts in optimistic concurrency control,
        such as version mismatches in aggregate updates. They are retry-able.

        Args:
            code: Unique error code (e.g., "Aggregate.VersionConflict")
            message: Human-readable error description

        Returns:
            Error with CONCURRENCY category
        """
        return cls(code=code, message=message, category=ErrorCategory.CONCURRENCY)

    @classmethod
    def security(cls, code: str, message: str) -> 'Error':
        """
        Create security error for authorization/authentication failures.

        Security errors represent failures in security checks, authorization,
        or authentication. They should be audited and logged.

        Args:
            code: Unique error code (e.g., "Access.Forbidden")
            message: Human-readable error description

        Returns:
            Error with SECURITY category
        """
        return cls(code=code, message=message, category=ErrorCategory.SECURITY)

    def with_metadata(self, **additional_metadata: Any) -> 'Error':
        """
        Create new error with additional metadata.

        Args:
            **additional_metadata: Key-value pairs to add to metadata

        Returns:
            New Error instance with merged metadata
        """
        merged_metadata = {**self.metadata, **additional_metadata}
        return Error(
            code=self.code,
            message=self.message,
            category=self.category,
            metadata=merged_metadata
        )

    def __str__(self) -> str:
        """String representation for logging and debugging"""
        return f"[{self.category.value}] {self.code}: {self.message}"