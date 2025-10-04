import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Query } from '../../src/Query';
import { IQueryHandler } from '../../src/IQueryHandler';

/**
 * UT-002: Query Return Type Contracts
 *
 * These tests verify that query handlers return correct types.
 * Following TDD principles: tests MUST fail before implementation.
 */

// Test DTO
interface OrderDetailsDto {
  orderId: string;
  customerName: string;
  totalAmount: number;
}

// Test query
class GetOrderDetailsQuery implements Query<OrderDetailsDto> {
  _isQuery = true as const;
  __phantom?: OrderDetailsDto;
  constructor(public readonly orderId: string) {}
}

describe('QueryTests', () => {
  // UT-002: T040
  test('Should_ReturnCorrectType_When_QueryHandlerExecutes', async () => {
    // Given: A query handler that returns a specific DTO type
    const expectedDto: OrderDetailsDto = {
      orderId: '123',
      customerName: 'John Doe',
      totalAmount: 100.50,
    };

    const handler: IQueryHandler<GetOrderDetailsQuery, OrderDetailsDto> = {
      async handle(_request: GetOrderDetailsQuery, _signal: AbortSignal): Promise<OrderDetailsDto> {
        return expectedDto;
      },
    };

    const mediator = new Mediator(
      [{ requestType: GetOrderDetailsQuery, handler }]
    );

    // When: Query is executed through mediator
    const signal = new AbortController().signal;
    const result = await mediator.send(new GetOrderDetailsQuery('123'), signal);

    // Then: Should return the correct TResult type
    expect(result).toEqual(expectedDto);
    expect(result.orderId).toBe('123');
    expect(result.customerName).toBe('John Doe');
    expect(result.totalAmount).toBe(100.50);
  });
});
