/**
 * Quickstart Example: Order Management Domain
 *
 * This example demonstrates how to use Architecture.Core abstractions
 * to build a simple order management domain model.
 */

import {
  ValueObject,
  Entity,
  AggregateRoot,
  DomainEventBase,
  Result,
  ResultOf,
  Maybe,
  Error,
  ErrorCategory
} from '../src';

// Value Objects
class Money extends ValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    super();
  }

  protected override getEqualityComponents(): readonly unknown[] {
    return [this.amount, this.currency];
  }

  public override toString(): string {
    return `${this.amount} ${this.currency}`;
  }
}

class CustomerId extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value || value.trim().length === 0) {
      throw new globalThis.Error('Customer ID cannot be empty');
    }
  }

  protected override getEqualityComponents(): readonly unknown[] {
    return [this.value];
  }

  public override toString(): string {
    return this.value;
  }
}

class OrderId extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value || value.trim().length === 0) {
      throw new globalThis.Error('Order ID cannot be empty');
    }
  }

  protected override getEqualityComponents(): readonly unknown[] {
    return [this.value];
  }

  public override toString(): string {
    return this.value;
  }
}

// Domain Events
class OrderCreatedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    correlationId?: string
  ) {
    super(correlationId);
    Object.freeze(this);
  }
}

class OrderConfirmedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    causationId?: string
  ) {
    super(undefined, causationId);
    Object.freeze(this);
  }
}

// Aggregate Root
class Order extends AggregateRoot<OrderId> {
  private _customerId: CustomerId;
  private _totalAmount: Money;
  private _status: 'Pending' | 'Confirmed' | 'Cancelled' = 'Pending';

  constructor(
    id: OrderId,
    customerId: CustomerId,
    totalAmount: Money
  ) {
    super(id);
    this._customerId = customerId;
    this._totalAmount = totalAmount;

    this.addEvent(new OrderCreatedEvent(
      id.value,
      customerId.value,
      totalAmount.amount
    ));
  }

  public get customerId(): CustomerId {
    return this._customerId;
  }

  public get totalAmount(): Money {
    return this._totalAmount;
  }

  public get status(): string {
    return this._status;
  }

  public confirm(): Result {
    if (this._status !== 'Pending') {
      return Result.fail(Error.domain(
        'ORDER_INVALID_STATUS',
        `Cannot confirm order in ${this._status} status`
      ));
    }

    this._status = 'Confirmed';
    this.addEvent(new OrderConfirmedEvent(this.id.value));

    return Result.ok();
  }

  public cancel(): Result {
    if (this._status === 'Confirmed') {
      return Result.fail(Error.domain(
        'ORDER_CANNOT_CANCEL',
        'Cannot cancel confirmed order'
      ));
    }

    this._status = 'Cancelled';
    return Result.ok();
  }
}

// Service functions demonstrating functional patterns
function createOrder(
  customerId: string,
  amount: number,
  currency: string
): ResultOf<Order> {
  try {
    // Validate inputs
    if (amount <= 0) {
      return ResultOf.fail(Error.validation(
        'INVALID_AMOUNT',
        'Order amount must be positive'
      ));
    }

    if (!customerId || customerId.trim().length === 0) {
      return ResultOf.fail(Error.validation(
        'INVALID_CUSTOMER',
        'Customer ID is required'
      ));
    }

    // Create value objects
    const orderIdValue = `ORDER-${Date.now()}`;
    const orderId = new OrderId(orderIdValue);
    const customerIdObj = new CustomerId(customerId);
    const money = new Money(amount, currency);

    // Create aggregate
    const order = new Order(orderId, customerIdObj, money);

    return ResultOf.ok(order);
  } catch (error) {
    return ResultOf.fail(Error.infrastructure(
      'ORDER_CREATION_FAILED',
      `Failed to create order: ${error}`
    ));
  }
}

function processOrder(order: Order): Result {
  return order.confirm()
    .bind(() => {
      // Simulate additional processing
      console.log(`Processing order ${order.id.value} for customer ${order.customerId.value}`);
      return Result.ok();
    });
}

// Demonstration
async function demonstrateOrderManagement(): Promise<void> {
  console.log('=== Architecture.Core TypeScript Demo ===\n');

  // Example 1: Create and process a valid order
  console.log('1. Creating a valid order...');
  const orderResult = createOrder('CUST-001', 100.50, 'USD');

  orderResult.match(
    order => {
      console.log(`✓ Order created: ${order.id.value}`);
      console.log(`  Customer: ${order.customerId.value}`);
      console.log(`  Amount: ${order.totalAmount.toString()}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Events: ${order.events.length}`);

      // Process the order
      const processResult = processOrder(order);
      processResult.match(
        () => console.log(`✓ Order ${order.id.value} processed successfully`),
        error => console.log(`✗ Failed to process order: ${error.message}`)
      );

      console.log(`  Final status: ${order.status}`);
      console.log(`  Total events: ${order.events.length}\n`);
    },
    error => {
      console.log(`✗ Failed to create order: ${error.message}\n`);
    }
  );

  // Example 2: Handle validation errors
  console.log('2. Trying to create an invalid order...');
  const invalidOrderResult = createOrder('', -50, 'USD');

  invalidOrderResult.match(
    order => console.log(`Unexpected success: ${order.id.value}`),
    error => {
      console.log(`✓ Validation caught: ${error.code} - ${error.message}`);
      console.log(`  Category: ${error.category}\n`);
    }
  );

  // Example 3: Demonstrate value object equality
  console.log('3. Value object equality demonstration...');
  const money1 = new Money(100, 'USD');
  const money2 = new Money(100, 'USD');
  const money3 = new Money(100, 'EUR');

  console.log(`money1 equals money2: ${money1.equals(money2)}`); // true
  console.log(`money1 equals money3: ${money1.equals(money3)}`); // false

  // Example 4: Maybe type usage
  console.log('\n4. Maybe type demonstration...');
  function findOrderById(id: string): Maybe<Order> {
    // Simulate database lookup
    if (id === 'ORDER-123') {
      const customerId = new CustomerId('CUST-123');
      const orderId = new OrderId(id);
      const money = new Money(75.25, 'USD');
      return Maybe.some(new Order(orderId, customerId, money));
    }
    return Maybe.none<Order>();
  }

  const foundOrder = findOrderById('ORDER-123');
  const notFoundOrder = findOrderById('ORDER-999');

  foundOrder.match(
    order => console.log(`✓ Found order: ${order.id.value} for ${order.totalAmount.toString()}`),
    () => console.log('Order not found')
  );

  notFoundOrder.match(
    order => console.log(`Found order: ${order.id.value}`),
    () => console.log('✓ Order ORDER-999 not found (as expected)')
  );

  console.log('\n=== Demo completed successfully! ===');
}

// Run the demonstration
if (require.main === module) {
  demonstrateOrderManagement().catch(console.error);
}