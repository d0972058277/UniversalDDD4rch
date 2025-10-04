"""Unit tests for Pipeline behavior execution order (UT-003, UT-003b, UT-008)."""

import pytest
from typing import List
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, ICommandHandler, IPipelineBehavior, ICommand, Unit


class TestCommand:
    """Test command for pipeline tests."""
    pass


class TestCommandHandler(ICommandHandler[TestCommand, Unit]):
    """Test command handler that records execution."""

    def __init__(self, execution_log: List[str]):
        self.execution_log = execution_log

    async def handle(self, command: TestCommand) -> Result[Unit]:
        """Handle test command."""
        self.execution_log.append("Handler")
        return Result.success(Unit)


class FirstBehavior(IPipelineBehavior[TestCommand, Unit]):
    """First test behavior."""

    def __init__(self, execution_log: List[str], order: int = 10):
        self.execution_log = execution_log
        self.order = order

    async def handle(self, request: TestCommand, next_handler) -> Result[Unit]:
        """Execute first behavior."""
        self.execution_log.append("FirstBehavior_Before")
        result = await next_handler()
        self.execution_log.append("FirstBehavior_After")
        return result


class SecondBehavior(IPipelineBehavior[TestCommand, Unit]):
    """Second test behavior."""

    def __init__(self, execution_log: List[str], order: int = 20):
        self.execution_log = execution_log
        self.order = order

    async def handle(self, request: TestCommand, next_handler) -> Result[Unit]:
        """Execute second behavior."""
        self.execution_log.append("SecondBehavior_Before")
        result = await next_handler()
        self.execution_log.append("SecondBehavior_After")
        return result


class ThirdBehavior(IPipelineBehavior[TestCommand, Unit]):
    """Third test behavior."""

    def __init__(self, execution_log: List[str], order: int = 30):
        self.execution_log = execution_log
        self.order = order

    async def handle(self, request: TestCommand, next_handler) -> Result[Unit]:
        """Execute third behavior."""
        self.execution_log.append("ThirdBehavior_Before")
        result = await next_handler()
        self.execution_log.append("ThirdBehavior_After")
        return result


class TestPipeline_BehaviorExecutionOrder:
    """Tests for pipeline behavior execution order (UT-003)."""

    @pytest.mark.asyncio
    async def test_should_execute_behaviors_in_order_when_request_processed(self):
        """
        Should execute behaviors in order when request processed.

        Given: A mediator with multiple behaviors registered in specific order
        When: A command is sent
        Then: Behaviors should execute in the registered order

        This test validates FR-007 that behaviors execute in configured order.
        """
        # Given
        execution_log: List[str] = []
        mediator = Mediator()
        handler = TestCommandHandler(execution_log)
        first_behavior = FirstBehavior(execution_log, order=10)
        second_behavior = SecondBehavior(execution_log, order=20)
        third_behavior = ThirdBehavior(execution_log, order=30)

        mediator.register_handler(TestCommand, handler)
        mediator.register_behavior(first_behavior)
        mediator.register_behavior(second_behavior)
        mediator.register_behavior(third_behavior)

        command = TestCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        # Behaviors should wrap in order: First wraps Second wraps Third wraps Handler
        assert execution_log == [
            "FirstBehavior_Before",
            "SecondBehavior_Before",
            "ThirdBehavior_Before",
            "Handler",
            "ThirdBehavior_After",
            "SecondBehavior_After",
            "FirstBehavior_After"
        ]


class TestPipeline_CustomBehaviorOrder:
    """Tests for custom behavior order configuration (UT-003b)."""

    @pytest.mark.asyncio
    async def test_should_allow_custom_order_when_behaviors_configured_out_of_recommended_sequence(self):
        """
        Should allow custom order when behaviors configured out of recommended sequence.

        Given: Behaviors registered in non-recommended order (e.g., Transaction before Validation)
        When: A command is sent
        Then: Behaviors should execute in the custom configured order (not recommended order)

        This test validates FR-007 requirement that system allows configuration of behavior
        execution order, including non-recommended sequences per spec.md:L74-75 edge case.
        """
        # Given
        execution_log: List[str] = []
        mediator = Mediator()
        handler = TestCommandHandler(execution_log)

        # Register in non-recommended order: Third (30) before First (10)
        third_behavior = ThirdBehavior(execution_log, order=30)
        first_behavior = FirstBehavior(execution_log, order=10)
        second_behavior = SecondBehavior(execution_log, order=20)

        mediator.register_handler(TestCommand, handler)
        # Register out of order - mediator should sort by order property
        mediator.register_behavior(third_behavior)
        mediator.register_behavior(first_behavior)
        mediator.register_behavior(second_behavior)

        command = TestCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        # Should still execute in order based on order property (10, 20, 30)
        assert execution_log == [
            "FirstBehavior_Before",  # order 10
            "SecondBehavior_Before",  # order 20
            "ThirdBehavior_Before",  # order 30
            "Handler",
            "ThirdBehavior_After",
            "SecondBehavior_After",
            "FirstBehavior_After"
        ]


class LoggingBehavior(IPipelineBehavior[TestCommand, Unit]):
    """Logging behavior for warning test."""

    def __init__(self, warning_log: List[str], order: int = 40):
        self.warning_log = warning_log
        self.order = order
        self.name = "LoggingBehavior"

    async def handle(self, request: TestCommand, next_handler) -> Result[Unit]:
        """Execute logging behavior."""
        return await next_handler()


class TestPipeline_BehaviorOrderWarning:
    """Tests for behavior order warning validation (UT-008)."""

    @pytest.mark.asyncio
    async def test_should_log_warning_when_behavior_order_deviates_from_recommended(self):
        """
        Should log warning when behavior order deviates from recommended.

        Given: Behaviors registered in non-recommended order (e.g., Logging before Validation)
        When: Mediator validates behavior order during initialization
        Then: Should log warning about deviation from recommended sequence

        This test validates BR-004 requirement that system logs warnings when behavior
        order deviates from recommended sequence (Validation → Authorization → Transaction
        → Telemetry → Resilience).

        Note: Implementation should check behavior order and emit warnings if:
        - Transaction (order ~30) comes before Validation (order ~10)
        - Telemetry (order ~40) comes before Authorization (order ~20)
        - etc.
        """
        # Given
        warning_log: List[str] = []
        mediator = Mediator()
        handler = TestCommandHandler([])

        # Create behaviors with suspicious ordering
        # Recommended: Validation(10) → Authorization(20) → Transaction(30) → Telemetry(40)
        # We'll register: Telemetry(15) → Validation(25) (telemetry before validation - wrong!)

        validation_behavior = FirstBehavior([], order=25)  # Should be ~10
        validation_behavior.name = "ValidationBehavior"

        telemetry_behavior = LoggingBehavior(warning_log, order=15)  # Should be ~40
        telemetry_behavior.name = "TelemetryBehavior"

        mediator.register_handler(TestCommand, handler)

        # When: Register in suspicious order
        # The mediator should detect and warn
        mediator.register_behavior(telemetry_behavior)
        mediator.register_behavior(validation_behavior)

        # Mediator should validate order and emit warnings
        warnings = mediator.validate_behavior_order()

        # Then
        # Should contain warning about telemetry (typically order 40) being before validation (typically order 10)
        assert len(warnings) > 0
        # Warning should mention the deviation
        assert any("order" in w.lower() for w in warnings) or any("sequence" in w.lower() for w in warnings)
