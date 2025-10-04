"""Mediator implementation for routing commands and queries."""

from typing import Any, TypeVar, Generic, Dict, Type, List, Callable, Awaitable
from architecture_core.functional import Result, Error

TRequest = TypeVar("TRequest")
TResponse = TypeVar("TResponse")


class Mediator:
    """
    Mediator for routing commands and queries to their handlers.

    Supports pipeline behaviors for cross-cutting concerns.
    Enforces handler uniqueness per FR-008 requirement.
    """

    def __init__(self) -> None:
        """Initialize the mediator."""
        self._handlers: Dict[Type[Any], Any] = {}
        self._behaviors: List[Any] = []

    def register_handler(
        self,
        request_type: Type[TRequest],
        handler: Any
    ) -> None:
        """
        Register a handler for a request type.

        Args:
            request_type: The type of request to handle
            handler: The handler instance

        Raises:
            ValueError: If a handler is already registered for this request type
        """
        if request_type in self._handlers:
            existing_handler = self._handlers[request_type]
            raise ValueError(
                f"Ambiguous handler registration detected: "
                f"Multiple handlers registered for {request_type.__name__}. "
                f"Existing handler: {existing_handler.__class__.__name__}, "
                f"New handler: {handler.__class__.__name__}"
            )

        self._handlers[request_type] = handler

    def register_behavior(self, behavior: Any) -> None:
        """
        Register a pipeline behavior.

        Args:
            behavior: The behavior to add to the pipeline
        """
        self._behaviors.append(behavior)

    def validate_behavior_order(self) -> List[str]:
        """
        Validate behavior order and return warnings for deviations.

        Returns:
            List of warning messages about order deviations
        """
        warnings = []

        # Recommended order: Validation(10) → Authorization(20) → Transaction(30) → Telemetry(40) → Resilience(60)
        # Check for suspicious orderings

        behaviors_with_order = [(b, getattr(b, 'order', 999), getattr(b, 'name', b.__class__.__name__))
                                for b in self._behaviors]
        behaviors_with_order.sort(key=lambda x: x[1])

        # Check for specific anti-patterns
        for i, (behavior, order, name) in enumerate(behaviors_with_order):
            # Check if telemetry/logging comes before validation
            if 'telemetry' in name.lower() or 'logging' in name.lower():
                if order < 20 and i < len(behaviors_with_order) - 1:
                    warnings.append(
                        f"Behavior order deviation: {name} (order {order}) should typically come after "
                        f"Validation (~10) and Authorization (~20)"
                    )

            # Check if validation comes after transaction
            if 'validation' in name.lower():
                if order > 30:
                    warnings.append(
                        f"Behavior order deviation: {name} (order {order}) should typically come before "
                        f"Transaction (~30) for better performance"
                    )

        return warnings

    async def send(self, request: TRequest) -> Result[TResponse]:
        """
        Send a request through the mediator pipeline.

        Args:
            request: The command or query to process

        Returns:
            Result containing the response or error
        """
        request_type = type(request)

        if request_type not in self._handlers:
            return Result.failure(
                Error.infrastructure(
                    "Mediator.HandlerNotFound",
                    f"No handler registered for {request_type.__name__}"
                )
            )

        handler = self._handlers[request_type]

        # Build pipeline with behaviors
        if self._behaviors:
            # Sort behaviors by order
            sorted_behaviors = sorted(self._behaviors, key=lambda b: getattr(b, 'order', 999))

            # Build the pipeline chain
            async def handler_delegate():
                return await handler.handle(request)

            # Wrap handler with behaviors (innermost to outermost)
            pipeline = handler_delegate
            for behavior in reversed(sorted_behaviors):
                # Capture current pipeline in closure
                current_pipeline = pipeline

                async def create_behavior_wrapper(b, curr_pipeline):
                    return await b.handle(request, curr_pipeline)

                # Create the wrapped pipeline
                pipeline = lambda b=behavior, cp=current_pipeline: create_behavior_wrapper(b, cp)

            # Execute the pipeline
            return await pipeline()
        else:
            # No behaviors, directly invoke handler
            return await handler.handle(request)
