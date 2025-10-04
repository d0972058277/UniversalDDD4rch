"""AuthorizationBehavior - Request permission checking."""

from typing import Protocol, TypeVar, Optional
from dataclasses import dataclass
from architecture_core.functional import Result
from architecture_shell_cqrs.behaviors import IPipelineBehavior

TRequest = TypeVar("TRequest")
TResponse = TypeVar("TResponse")


@dataclass(frozen=True)
class AuthorizationResult:
    """Result of authorization check."""

    is_authorized: bool
    failure_reason: Optional[str] = None


class UnauthorizedException(Exception):
    """
    Thrown when authorization fails.

    Signals that current user lacks permission to execute request.
    """

    def __init__(self, request_type: str, reason: Optional[str] = None):
        message = f"Unauthorized access to {request_type}"
        if reason:
            message += f": {reason}"
        super().__init__(message)
        self.request_type = request_type
        self.reason = reason


class IAuthorizer(Protocol[TRequest, TResponse]):
    """
    Authorization abstraction for request permissions.

    Integrate with authentication/authorization frameworks like Django auth, Flask-Login, etc.
    """

    async def is_authorized(self, request: TRequest) -> AuthorizationResult:
        """
        Check if current user is authorized to execute the request.

        Args:
            request: The request to authorize

        Returns:
            AuthorizationResult indicating permission status
        """
        ...


class AuthorizationBehavior(IPipelineBehavior[TRequest, TResponse]):
    """
    Pipeline behavior that checks request permissions.

    Executes after validation, before expensive operations (transaction opening, handler execution).
    Short-circuits pipeline by throwing UnauthorizedException on authorization failure.

    **Recommended order:** 20 (after validation, before transaction)

    Example:
        ```python
        behavior = AuthorizationBehavior(authorizer)
        mediator.register_behavior(behavior)
        ```
    """

    order = 20

    def __init__(self, authorizer: IAuthorizer[TRequest, TResponse]):
        """
        Initialize AuthorizationBehavior.

        Args:
            authorizer: Authorizer implementation for permission checking
        """
        self.authorizer = authorizer

    async def handle(self, request: TRequest, next_handler) -> Result[TResponse]:
        """
        Handle request with authorization check.

        Args:
            request: The request being processed
            next_handler: Delegate to invoke next behavior or handler

        Returns:
            Result containing response or error

        Raises:
            UnauthorizedException: When authorization fails
        """
        # Pre-handler authorization check
        auth_result = await self.authorizer.is_authorized(request)

        if not auth_result.is_authorized:
            raise UnauthorizedException(
                type(request).__name__, auth_result.failure_reason
            )

        # Continue pipeline
        return await next_handler()


__all__ = [
    "AuthorizationBehavior",
    "IAuthorizer",
    "AuthorizationResult",
    "UnauthorizedException",
]
