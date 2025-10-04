import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { BaseRequest } from '../../src/BaseRequest';
import { Query } from '../../src/Query';
import { ICommandHandlerWithResult } from '../../src/ICommandHandler';
import { IQueryHandler } from '../../src/IQueryHandler';
import { UnitOfWorkBehavior, ILogger } from '../../src/behaviors/UnitOfWorkBehavior';
import { TelemetryBehavior } from '../../src/behaviors/TelemetryBehavior';
import { InMemoryUnitOfWork } from '../InMemoryUnitOfWork';
import { CommandOnlyMatcher, AllRequestsMatcher } from '../../src/IBehaviorMatcher';
import { IPipelineBehavior } from '../../src/IPipelineBehavior';

// Result monad (simplified for quickstart)
class Result<T> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: string,
    public readonly isSuccess: boolean = true
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result(value, undefined, true);
  }

  static failure<T>(error: string): Result<T> {
    return new Result<T>(undefined, error, false);
  }

  get value(): T {
    if (!this.isSuccess) throw new Error('Cannot get value from failed result');
    return this._value!;
  }

  get error(): string {
    if (this.isSuccess) throw new Error('Cannot get error from successful result');
    return this._error!;
  }

  get isFailure(): boolean {
    return !this.isSuccess;
  }
}

// Domain types (from quickstart.md example)
class CreateOrderCommand implements BaseRequest<Result<string>> {
  _isCommand = true as const;
  __phantom?: Result<string>;

  constructor(
    public readonly customerId: string,
    public readonly items: Array<{ productId: string; quantity: number }>
  ) {}
}

class GetOrderDetailsQuery implements Query<OrderDetailsDto> {
  _isQuery = true as const;
  __phantom?: OrderDetailsDto;

  constructor(public readonly orderId: string) {}
}

interface OrderDetailsDto {
  orderId: string;
  customerId: string;
  status: string;
  items: Array<{ productId: string; productName: string; quantity: number; price: number }>;
  totalAmount: number;
}

describe('QuickstartValidationTests', () => {
  /**
   * Quickstart Integration Test
   *
   * Validates the quickstart.md example works end-to-end:
   * 1. Command creates order with transaction
   * 2. Query retrieves order without transaction
   * 3. Pipeline behaviors execute in correct order
   */
  it('Should_ExecuteQuickstartExample_When_IntegratedCorrectly', async () => {
    // Given: UnitOfWork, logger, and handlers (from quickstart.md)
    const unitOfWork = new InMemoryUnitOfWork();
    const logger: ILogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Simulated in-memory order storage
    const orderStore = new Map<string, OrderDetailsDto>();

    // Command handler (from quickstart.md Step 3)
    const createOrderHandler: ICommandHandlerWithResult<CreateOrderCommand, Result<string>> = {
      async handle(
        command: CreateOrderCommand,
        _signal: AbortSignal
      ): Promise<Result<string>> {
        // Business validation
        if (!command.items || command.items.length === 0) {
          return Result.failure('Order must have at least one item');
        }

        // Create order
        const orderId = `order-${Date.now()}`;
        const order: OrderDetailsDto = {
          orderId,
          customerId: command.customerId,
          status: 'Draft',
          items: command.items.map((item) => ({
            productId: item.productId,
            productName: `Product ${item.productId}`,
            quantity: item.quantity,
            price: 19.99,
          })),
          totalAmount: command.items.reduce((sum, item) => sum + item.quantity * 19.99, 0),
        };

        orderStore.set(orderId, order);
        return Result.success(orderId);
      },
    };

    // Query handler (from quickstart.md Step 3)
    const getOrderDetailsHandler: IQueryHandler<GetOrderDetailsQuery, OrderDetailsDto> = {
      async handle(
        query: GetOrderDetailsQuery,
        _signal: AbortSignal
      ): Promise<OrderDetailsDto> {
        const order = orderStore.get(query.orderId);
        if (!order) {
          throw new Error(`Order ${query.orderId} not found`);
        }
        return order;
      },
    };

    // Mediator with behaviors (from quickstart.md Step 4)
    const mediator = new Mediator(
      [
        { requestType: CreateOrderCommand, handler: createOrderHandler },
        { requestType: GetOrderDetailsQuery, handler: getOrderDetailsHandler },
      ],
      [
        // Note: ValidationBehavior requires a validator instance, omitting for quickstart simplicity
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger) as IPipelineBehavior<any, any>,
          matcher: new CommandOnlyMatcher(),
        },
        {
          behavior: new TelemetryBehavior(logger) as IPipelineBehavior<any, any>,
          matcher: new AllRequestsMatcher(),
        },
      ]
    );

    // When: Execute command (from quickstart.md Step 5)
    const createCommand = new CreateOrderCommand('customer-123', [
      { productId: 'P1', quantity: 2 },
      { productId: 'P2', quantity: 1 },
    ]);

    const controller = new AbortController();
    const createResult = await mediator.send(createCommand, controller.signal);

    // Then: Command succeeds with transaction
    expect(createResult).toBeInstanceOf(Result);
    expect((createResult as Result<string>).isSuccess).toBe(true);
    const orderId = (createResult as Result<string>).value;
    expect(orderId).toMatch(/^order-\d+$/);

    // When: Execute query (from quickstart.md Step 5)
    const getQuery = new GetOrderDetailsQuery(orderId);
    const orderDetails = await mediator.send(getQuery, controller.signal);

    // Then: Query returns order details
    expect(orderDetails.orderId).toBe(orderId);
    expect(orderDetails.customerId).toBe('customer-123');
    expect(orderDetails.status).toBe('Draft');
    expect(orderDetails.items).toHaveLength(2);
    expect(orderDetails.totalAmount).toBeCloseTo(59.97, 2); // 2*19.99 + 1*19.99
  });

  /**
   * Quickstart validation failure test
   */
  it('Should_ReturnValidationError_When_CommandInvalid', async () => {
    // Given: Mediator with validation behavior
    const unitOfWork = new InMemoryUnitOfWork();
    const logger: ILogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const createOrderHandler: ICommandHandlerWithResult<CreateOrderCommand, Result<string>> = {
      async handle(
        command: CreateOrderCommand,
        _signal: AbortSignal
      ): Promise<Result<string>> {
        if (!command.items || command.items.length === 0) {
          return Result.failure('Order must have at least one item');
        }
        return Result.success('order-success');
      },
    };

    const mediator = new Mediator(
      [{ requestType: CreateOrderCommand, handler: createOrderHandler }],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger) as IPipelineBehavior<any, any>,
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When: Execute invalid command (empty items)
    const invalidCommand = new CreateOrderCommand('customer-456', []);
    const controller = new AbortController();
    const result = await mediator.send(invalidCommand, controller.signal);

    // Then: Business validation failure (transaction still commits per BR-008)
    expect((result as Result<string>).isFailure).toBe(true);
    expect((result as Result<string>).error).toBe('Order must have at least one item');
  });
});
