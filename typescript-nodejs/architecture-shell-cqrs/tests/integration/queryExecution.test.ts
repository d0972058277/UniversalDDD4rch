import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Query } from '../../src/Query';
import { IQueryHandler } from '../../src/IQueryHandler';
import { UnitOfWorkBehavior, ILogger } from '../../src/behaviors/UnitOfWorkBehavior';
import { InMemoryUnitOfWork } from '../InMemoryUnitOfWork';
import { AllRequestsMatcher } from '../../src/IBehaviorMatcher';
import { IPipelineBehavior } from '../../src/IPipelineBehavior';

// Test query
class GetOrderDetailsQuery implements Query<OrderDto> {
  _isQuery = true as const;
  __phantom?: OrderDto;
  constructor(public readonly orderId: string) {}
}

interface OrderDto {
  orderId: string;
  customerName: string;
  totalAmount: number;
}

describe('QueryExecutionTests', () => {
  /**
   * IT-004: Query Execution Without Transaction
   *
   * Validates BR-003 requirement that queries do NOT open transactions.
   * UnitOfWork behavior should skip transaction management for queries entirely.
   */
  it('Should_SkipTransactionManagement_When_QueryExecutes', async () => {
    // Given: UnitOfWork and query handler
    const unitOfWork = new InMemoryUnitOfWork();
    const logger: ILogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    let beginTransactionCalled = false;
    unitOfWork.beginTransaction = async (_signal: AbortSignal) => {
      beginTransactionCalled = true;
    };

    const handler: IQueryHandler<GetOrderDetailsQuery, OrderDto> = {
      async handle(request: GetOrderDetailsQuery, _signal: AbortSignal): Promise<OrderDto> {
        return {
          orderId: request.orderId,
          customerName: 'John Doe',
          totalAmount: 99.99,
        };
      },
    };

    const mediator = new Mediator(
      [{ requestType: GetOrderDetailsQuery, handler }],
      [
        {
          // UnitOfWork with AllRequestsMatcher to verify it correctly filters queries
          behavior: new UnitOfWorkBehavior(unitOfWork, logger) as IPipelineBehavior<any, any>,
          matcher: new AllRequestsMatcher(), // Would apply to all requests
        },
      ]
    );

    // When: Query executes
    const query = new GetOrderDetailsQuery('order-123');
    const controller = new AbortController();
    const result = await mediator.send(query, controller.signal);

    // Then: Transaction NOT opened (query skips UnitOfWork behavior)
    expect(beginTransactionCalled).toBe(false);
    expect(unitOfWork.hasActiveTransaction).toBe(false);
    expect(result.orderId).toBe('order-123');
    expect(result.customerName).toBe('John Doe');
  });
});
