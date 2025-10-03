package com.architecture.shell.cqrs;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for Query return type contracts.
 * Tests follow TDD approach - written before implementation exists.
 * Naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class QueryTests {

    /**
     * T038: UT-002 - Query Return Type Contracts
     * Given: A query handler that returns a specific DTO type
     * When: Query is executed through mediator
     * Then: Should return correct DTO type with expected data
     */
    @Test
    void should_ReturnCorrectType_When_QueryHandlerExecutes() {
        // Given: A mediator with a registered query handler
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new GetOrderDetailsHandler());
        var mediator = new MediatorImpl(handlerRegistry);

        var orderId = "ORDER-123";
        var query = new GetOrderDetailsQuery(orderId);

        // When: Query is executed
        OrderDetailsDto result = mediator.send(query);

        // Then: Should return correct DTO type with expected data
        assertThat(result).isNotNull();
        assertThat(result.orderId()).isEqualTo(orderId);
        assertThat(result.customerName()).isNotEmpty();
        assertThat(result.totalAmount()).isGreaterThan(0);
    }

    // Test fixtures

    /**
     * Test query for order details
     */
    private record GetOrderDetailsQuery(String orderId) implements Query<OrderDetailsDto> {
    }

    /**
     * Test DTO for order details
     */
    private record OrderDetailsDto(
        String orderId,
        String customerName,
        double totalAmount
    ) {
    }

    /**
     * Test query handler
     */
    private static class GetOrderDetailsHandler implements QueryHandler<GetOrderDetailsQuery, OrderDetailsDto> {
        @Override
        public OrderDetailsDto handle(GetOrderDetailsQuery query) {
            // Given: Mock data for test
            return new OrderDetailsDto(
                query.orderId(),
                "John Doe",
                99.99
            );
        }
    }
}
