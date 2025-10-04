"""ValidationBehavior - Request payload validation."""

from typing import Protocol, TypeVar, Any, Optional
from dataclasses import dataclass
from architecture_core.functional import Result
from architecture_shell_cqrs.behaviors import IPipelineBehavior

TRequest = TypeVar("TRequest")
TResponse = TypeVar("TResponse")


@dataclass(frozen=True)
class ValidationError:
    """Individual validation failure."""

    property_name: str
    error_message: str
    attempted_value: Optional[Any] = None


@dataclass(frozen=True)
class ValidationResult:
    """Result of validation operation."""

    is_valid: bool
    errors: list[ValidationError]


class ValidationException(Exception):
    """
    Thrown when validation fails.

    Signals that request payload is invalid and pipeline should short-circuit.
    """

    def __init__(self, validation_errors: list[ValidationError]):
        self.validation_errors = validation_errors
        error_messages = [
            f"{e.property_name}: {e.error_message}" for e in validation_errors
        ]
        super().__init__(f"Validation failed: {', '.join(error_messages)}")


class IValidator(Protocol[TRequest, TResponse]):
    """
    Validation abstraction for request payloads.

    Integrate with validation libraries like pydantic, cerberus, marshmallow, etc.
    """

    async def validate(self, request: TRequest) -> ValidationResult:
        """
        Validate the request payload.

        Args:
            request: The request to validate

        Returns:
            ValidationResult with errors if invalid
        """
        ...


class ValidationBehavior(IPipelineBehavior[TRequest, TResponse]):
    """
    Pipeline behavior that validates request payloads.

    Executes before handler to ensure request data is valid.
    Short-circuits pipeline by throwing ValidationException on validation failure.

    **Recommended order:** 10 (execute first to fail fast on invalid data)

    Example:
        ```python
        behavior = ValidationBehavior(validator)
        mediator.register_behavior(behavior)
        ```
    """

    order = 10

    def __init__(self, validator: IValidator[TRequest, TResponse]):
        """
        Initialize ValidationBehavior.

        Args:
            validator: Validator implementation for request validation
        """
        self.validator = validator

    async def handle(self, request: TRequest, next_handler) -> Result[TResponse]:
        """
        Handle request with validation.

        Args:
            request: The request being processed
            next_handler: Delegate to invoke next behavior or handler

        Returns:
            Result containing response or error

        Raises:
            ValidationException: When validation fails
        """
        # Pre-handler validation
        validation_result = await self.validator.validate(request)

        if not validation_result.is_valid:
            raise ValidationException(validation_result.errors)

        # Continue pipeline
        return await next_handler()


__all__ = [
    "ValidationBehavior",
    "IValidator",
    "ValidationResult",
    "ValidationError",
    "ValidationException",
]
