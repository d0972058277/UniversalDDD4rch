package com.architecture.shell.cqrs;

import com.architecture.core.functional.Result;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T188: Quickstart validation test - validates end-to-end CQRS integration.
 *
 * <p>This test simulates the quickstart guide scenario:
 * <ol>
 *   <li>Define a command and query</li>
 *   <li>Implement handlers</li>
 *   <li>Register with mediator</li>
 *   <li>Execute through pipeline with behaviors</li>
 * </ol>
 *
 * <p>Tests follow TDD approach: Should_ExpectedBehavior_When_StateUnderTest
 */
class QuickstartTests {

    /**
     * End-to-end quickstart scenario validation.
     *
     * <p>Given: Complete CQRS setup with command, query, handlers, and behaviors
     * <p>When: Executing command and query through mediator
     * <p>Then: Should successfully process both with correct behavior execution
     */
    @Test
    void should_ProcessCommandAndQuery_When_QuickstartScenarioExecuted() {
        // Given: Setup tracking for behavior execution
        var telemetryExecuted = new AtomicBoolean(false);
        var unitOfWorkExecuted = new AtomicBoolean(false);
        var commandHandlerExecuted = new AtomicBoolean(false);
        var queryHandlerExecuted = new AtomicBoolean(false);

        // Given: Create handler registry with quickstart handlers
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new CreateOrderHandler(commandHandlerExecuted));
        handlerRegistry.register(new GetOrderHandler(queryHandlerExecuted));

        // Given: Create behavior registry with minimal behaviors
        var behaviorRegistry = new BehaviorRegistry();

        // Telemetry behavior (tracks execution)
        behaviorRegistry.register(
            new TrackingTelemetryBehavior<>(telemetryExecuted),
            10,
            new BehaviorMatcher.AllRequestsMatcher()
        );

        // Mock UnitOfWork behavior (tracks transaction for commands only)
        behaviorRegistry.register(
            new TrackingUnitOfWorkBehavior<>(unitOfWorkExecuted),
            20,
            new BehaviorMatcher.CommandOnlyMatcher()
        );

        // Given: Create mediator
        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Execute command through mediator
        var createCommand = new CreateOrderCommand("customer-123", "item-456");
        Result<String> commandResult = mediator.send(createCommand);

        // Then: Command should succeed
        assertThat(commandResult.isSuccess()).isTrue();
        assertThat(commandResult.getValue()).isEqualTo("order-123");

        // Then: Command behaviors should execute
        assertThat(commandHandlerExecuted.get())
            .as("Command handler should be executed")
            .isTrue();
        assertThat(telemetryExecuted.get())
            .as("Telemetry behavior should execute for commands")
            .isTrue();
        assertThat(unitOfWorkExecuted.get())
            .as("UnitOfWork behavior should execute for commands only")
            .isTrue();

        // Given: Reset tracking flags for query
        telemetryExecuted.set(false);
        unitOfWorkExecuted.set(false);

        // When: Execute query through mediator
        var query = new GetOrderQuery("order-123");
        OrderDto queryResult = mediator.send(query);

        // Then: Query should succeed
        assertThat(queryResult).isNotNull();
        assertThat(queryResult.orderId()).isEqualTo("order-123");
        assertThat(queryResult.customerId()).isEqualTo("customer-123");

        // Then: Query behaviors should execute (but not UnitOfWork)
        assertThat(queryHandlerExecuted.get())
            .as("Query handler should be executed")
            .isTrue();
        assertThat(telemetryExecuted.get())
            .as("Telemetry behavior should execute for queries")
            .isTrue();
        assertThat(unitOfWorkExecuted.get())
            .as("UnitOfWork behavior should NOT execute for queries")
            .isFalse();
    }

    // Test fixtures simulating quickstart guide examples

    /**
     * Quickstart example command: CreateOrder
     */
    private static class CreateOrderCommand implements Command<Result<String>> {
        private final String customerId;
        private final String itemId;

        CreateOrderCommand(String customerId, String itemId) {
            this.customerId = customerId;
            this.itemId = itemId;
        }

        String getCustomerId() {
            return customerId;
        }

        String getItemId() {
            return itemId;
        }
    }

    /**
     * Quickstart example command handler
     */
    private static class CreateOrderHandler implements CommandHandler<CreateOrderCommand, Result<String>> {
        private final AtomicBoolean executionTracker;

        CreateOrderHandler(AtomicBoolean executionTracker) {
            this.executionTracker = executionTracker;
        }

        @Override
        public Result<String> handle(CreateOrderCommand command) {
            executionTracker.set(true);
            // Simulate order creation
            return Result.success("order-123");
        }
    }

    /**
     * Quickstart example query: GetOrder
     */
    private static class GetOrderQuery implements Query<OrderDto> {
        private final String orderId;

        GetOrderQuery(String orderId) {
            this.orderId = orderId;
        }

        String getOrderId() {
            return orderId;
        }
    }

    /**
     * Quickstart example DTO
     */
    private record OrderDto(String orderId, String customerId) {
    }

    /**
     * Quickstart example query handler
     */
    private static class GetOrderHandler implements QueryHandler<GetOrderQuery, OrderDto> {
        private final AtomicBoolean executionTracker;

        GetOrderHandler(AtomicBoolean executionTracker) {
            this.executionTracker = executionTracker;
        }

        @Override
        public OrderDto handle(GetOrderQuery query) {
            executionTracker.set(true);
            // Simulate order retrieval
            return new OrderDto(query.getOrderId(), "customer-123");
        }
    }

    /**
     * Tracking telemetry behavior for test validation
     */
    private static class TrackingTelemetryBehavior<TRequest extends BaseRequest, TResponse>
        implements PipelineBehavior<TRequest, TResponse> {

        private final AtomicBoolean executionTracker;

        TrackingTelemetryBehavior(AtomicBoolean executionTracker) {
            this.executionTracker = executionTracker;
        }

        @Override
        public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
            executionTracker.set(true);
            return next.handle();
        }
    }

    /**
     * Tracking UnitOfWork behavior for test validation (mocked)
     */
    private static class TrackingUnitOfWorkBehavior<TRequest extends BaseRequest, TResponse>
        implements PipelineBehavior<TRequest, TResponse> {

        private final AtomicBoolean executionTracker;

        TrackingUnitOfWorkBehavior(AtomicBoolean executionTracker) {
            this.executionTracker = executionTracker;
        }

        @Override
        public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
            executionTracker.set(true);
            // Simulate transaction: begin -> execute -> commit
            try {
                return next.handle();
            } catch (Exception e) {
                // Simulate rollback on exception
                throw e;
            }
        }
    }
}
