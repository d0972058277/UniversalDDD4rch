# Quickstart Guide: Architecture.Shell - CQRS Module

**Audience**: Developers integrating the CQRS module into their application layer
**Time**: 15 minutes
**Prerequisites**: Architecture.Core installed (Result<T>, Entity, Repository abstractions)

---

## Installation

### C# (.NET 8+)
```bash
dotnet add package Architecture.Shell.Cqrs
dotnet add package Architecture.Shell.Cqrs.EntityFramework  # Optional: EF Core integration
```

### TypeScript (Node.js 22+)
```bash
npm install @architecture/shell-cqrs
npm install reflect-metadata  # Required for decorators
```

### Java (Spring Boot)
```xml
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-shell-cqrs</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Go (1.21+)
```bash
go get github.com/universal-ddd/architecture-shell/cqrs
```

### Python (3.11+)
```bash
pip install architecture-shell-cqrs
```

---

## Step 1: Define Your Domain Model (5 minutes)

Using Architecture.Core abstractions, define an aggregate:

```csharp
// C# Example
using Architecture.Core.Domain;

public class Order : AggregateRoot<OrderId>
{
    public CustomerId CustomerId { get; private set; }
    public List<OrderItem> Items { get; private set; }
    public OrderStatus Status { get; private set; }

    private Order() { } // EF Core

    public static Result<Order> Create(CustomerId customerId, List<OrderItem> items)
    {
        // Given: Business validation
        if (items == null || !items.Any())
            return Result.Failure<Order>(Error.Validation("Order must have at least one item"));

        // When: Create aggregate
        var order = new Order
        {
            Id = OrderId.NewId(),
            CustomerId = customerId,
            Items = items,
            Status = OrderStatus.Draft
        };

        // Then: Raise domain event
        order.AddDomainEvent(new OrderCreatedEvent(order.Id, customerId));
        return Result.Success(order);
    }
}
```

---

## Step 2: Define Commands and Queries (3 minutes)

Create application-layer requests:

```csharp
// C# Command with return value
using Architecture.Shell.Cqrs;

public record CreateOrderCommand(
    Guid CustomerId,
    List<OrderItemDto> Items
) : ICommand<Result<Guid>>;  // Returns Result<OrderId>

// C# Query
public record GetOrderDetailsQuery(
    Guid OrderId
) : IQuery<OrderDetailsDto>;  // Returns DTO
```

```typescript
// TypeScript Command
import { Command } from '@architecture/shell-cqrs';

@CommandMarker()
export class CreateOrderCommand implements Command<Result<string>> {
  constructor(
    public readonly customerId: string,
    public readonly items: OrderItemDto[]
  ) {}
}

// TypeScript Query
@QueryMarker()
export class GetOrderDetailsQuery implements Query<OrderDetailsDto> {
  constructor(public readonly orderId: string) {}
}
```

---

## Step 3: Implement Handlers (5 minutes)

### Command Handler

```csharp
// C#
using Architecture.Shell.Cqrs;
using Architecture.Core.Repositories;

public class CreateOrderHandler : ICommandHandler<CreateOrderCommand, Result<Guid>>
{
    private readonly IRepository<Order, OrderId> _orderRepository;
    private readonly IOrderDomainService _domainService;

    public CreateOrderHandler(
        IRepository<Order, OrderId> orderRepository,
        IOrderDomainService domainService)
    {
        _orderRepository = orderRepository;
        _domainService = domainService;
    }

    public async Task<Result<Guid>> HandleAsync(
        CreateOrderCommand command,
        CancellationToken cancellationToken)
    {
        // Given: Validate business rules
        var customerId = new CustomerId(command.CustomerId);
        var items = command.Items.Select(dto => new OrderItem(dto.ProductId, dto.Quantity)).ToList();

        var validationResult = await _domainService.ValidateOrderAsync(customerId, items, cancellationToken);
        if (validationResult.IsFailure)
            return validationResult;  // Business error - transaction will commit

        // When: Create aggregate
        var orderResult = Order.Create(customerId, items);
        if (orderResult.IsFailure)
            return Result.Failure<Guid>(orderResult.Error);

        // Then: Persist (throws on DB failure - transaction will rollback)
        await _orderRepository.AddAsync(orderResult.Value, cancellationToken);

        return Result.Success(orderResult.Value.Id.Value);
    }
}
```

### Query Handler

```csharp
// C#
public class GetOrderDetailsHandler : IQueryHandler<GetOrderDetailsQuery, OrderDetailsDto>
{
    private readonly IOrderReadModel _readModel;

    public GetOrderDetailsHandler(IOrderReadModel readModel)
    {
        _readModel = readModel;
    }

    public async Task<OrderDetailsDto> HandleAsync(
        GetOrderDetailsQuery query,
        CancellationToken cancellationToken)
    {
        // Given: Query read model (no transaction)
        var orderId = new OrderId(query.OrderId);

        // When: Execute read-optimized query
        var dto = await _readModel.GetOrderDetailsAsync(orderId, cancellationToken);

        // Then: Return DTO (throws if not found - infrastructure error)
        if (dto == null)
            throw new NotFoundException($"Order {orderId} not found");

        return dto;
    }
}
```

---

## Step 4: Register with Dependency Injection (2 minutes)

### Behavior Ordering Guidance

**Recommended Order** (per spec.md BR-004):
1. **Validation** (order: 10) - Fail fast on invalid payloads before expensive operations
2. **Authorization** (order: 20) - Verify permissions before business logic
3. **Transaction/UnitOfWork** (order: 30) - Open transaction only after validation/authorization pass
4. **Telemetry** (order: 40) - Measure handler execution time and capture exceptions
5. **Caching** (order: 50, queries only) - Return cached results or write-through on cache miss
6. **Resilience** (order: 60, optional) - Retry/timeout/circuit breaker for external dependencies

**⚠️ Important**: Behavior ordering is **configurable** but dangerous orderings can harm performance or security:
- ❌ **Transaction before Validation**: Opens database connections for invalid requests (resource waste)
- ❌ **Telemetry before Authorization**: Logs sensitive data from unauthorized requests (audit risk)
- ⚠️ **Authorization after Transaction**: Wastes transaction resources checking permissions

**Rationale**: The recommended order optimizes for "fail fast" principles—cheap validations first, expensive operations (DB transactions) last. This ordering is **advisory**, not enforced at runtime, but violating it may cause performance degradation or security concerns.

---

### C# (.NET)
```csharp
// Program.cs or Startup.cs
services.AddCqrs(configuration =>
{
    // Scan assemblies for handlers
    configuration.RegisterHandlersFromAssembly(typeof(CreateOrderHandler).Assembly);

    // Register pipeline behaviors in recommended order
    configuration.AddBehavior<ValidationBehavior<,>>(order: 10);
    configuration.AddBehavior<AuthorizationBehavior<,>>(order: 20);
    configuration.AddBehavior<UnitOfWorkBehavior<,>>(order: 30, CommandOnlyMatcher);
    configuration.AddBehavior<TelemetryBehavior<,>>(order: 40);
    configuration.AddBehavior<CachingBehavior<,>>(order: 50, QueryOnlyMatcher);
});

// Register UnitOfWork implementation
services.AddScoped<IUnitOfWork, EntityFrameworkUnitOfWork>();
```

### TypeScript
```typescript
// main.ts
import { Container } from 'inversify';
import { CqrsModule } from '@architecture/shell-cqrs';

const container = new Container();

container.load(
  new CqrsModule({
    handlers: [CreateOrderHandler, GetOrderDetailsHandler],
    behaviors: [
      { type: ValidationBehavior, order: 10 },
      { type: AuthorizationBehavior, order: 20 },
      { type: UnitOfWorkBehavior, order: 30, matcher: isCommand },
      { type: TelemetryBehavior, order: 40 },
      { type: CachingBehavior, order: 50, matcher: isQuery }
    ]
  })
);
```

### Java (Spring Boot)
```java
// CqrsConfiguration.java
@Configuration
public class CqrsConfiguration {

    @Bean
    public Mediator mediator(
            List<RequestHandler<?, ?>> handlers,
            List<PipelineBehavior<?, ?>> behaviors) {
        return new MediatorImpl(handlers, behaviors);
    }

    @Bean
    public PipelineBehavior<?, ?> validationBehavior() {
        return new ValidationBehavior<>(10);
    }

    @Bean
    public PipelineBehavior<?, ?> unitOfWorkBehavior(UnitOfWork unitOfWork) {
        return new UnitOfWorkBehavior<>(30, unitOfWork, new CommandOnlyMatcher());
    }
}
```

---

## Step 5: Use the Mediator (1 minute)

### In Controllers/API Endpoints

```csharp
// C# ASP.NET Core Controller
[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        // Given: Map request to command
        var command = new CreateOrderCommand(
            request.CustomerId,
            request.Items
        );

        // When: Send through mediator pipeline
        var result = await _mediator.SendAsync(command, cancellationToken);

        // Then: Return result
        return result.IsSuccess
            ? Ok(new { OrderId = result.Value })
            : BadRequest(new { Error = result.Error.Message });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderDetails(
        Guid id,
        CancellationToken cancellationToken)
    {
        // Given: Create query
        var query = new GetOrderDetailsQuery(id);

        // When: Send through mediator
        var dto = await _mediator.SendAsync(query, cancellationToken);

        // Then: Return DTO
        return Ok(dto);
    }
}
```

### TypeScript Express
```typescript
// orders.controller.ts
import { Request, Response } from 'express';
import { IMediator } from '@architecture/shell-cqrs';

export class OrdersController {
  constructor(private readonly mediator: IMediator) {}

  async createOrder(req: Request, res: Response): Promise<void> {
    // Given
    const command = new CreateOrderCommand(
      req.body.customerId,
      req.body.items
    );

    // When
    const result = await this.mediator.send(command, req.signal);

    // Then
    if (result.isSuccess) {
      res.status(201).json({ orderId: result.value });
    } else {
      res.status(400).json({ error: result.error.message });
    }
  }

  async getOrderDetails(req: Request, res: Response): Promise<void> {
    const query = new GetOrderDetailsQuery(req.params.id);
    const dto = await this.mediator.send(query, req.signal);
    res.json(dto);
  }
}
```

---

## Expected Output

### Successful Command Execution
```json
POST /api/orders
{
  "customerId": "123e4567-e89b-12d3-a456-426614174000",
  "items": [
    { "productId": "P1", "quantity": 2 },
    { "productId": "P2", "quantity": 1 }
  ]
}

Response: 201 Created
{
  "orderId": "789e4567-e89b-12d3-a456-426614174111"
}
```

### Logs (Telemetry Behavior)
```
[INFO] 2025-09-30T10:15:23.456Z - CreateOrderCommand started
[INFO] TransactionId: a1b2c3d4-e5f6-4789-0123-456789abcdef
[INFO] Duration: 45ms
[INFO] Status: Success
[INFO] Result: OrderId=789e4567-e89b-12d3-a456-426614174111
```

### Query Execution
```json
GET /api/orders/789e4567-e89b-12d3-a456-426614174111

Response: 200 OK
{
  "orderId": "789e4567-e89b-12d3-a456-426614174111",
  "customerId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "Draft",
  "items": [
    { "productId": "P1", "productName": "Product 1", "quantity": 2, "price": 19.99 },
    { "productId": "P2", "productName": "Product 2", "quantity": 1, "price": 29.99 }
  ],
  "totalAmount": 69.97
}
```

---

## Validation

Run these checks to verify integration:

### 1. Handler Registration Test
```csharp
[Test]
public void Should_RegisterAllHandlers_When_ApplicationStarts()
{
    // Given
    var serviceProvider = BuildServiceProvider();
    var mediator = serviceProvider.GetRequiredService<IMediator>();

    // When
    var command = new CreateOrderCommand(Guid.NewGuid(), new List<OrderItemDto>());

    // Then - Should not throw HandlerNotFoundException
    Assert.DoesNotThrow(() => mediator.SendAsync(command));
}
```

### 2. Transaction Test
```csharp
[Test]
public async Task Should_CommitTransaction_When_CommandSucceeds()
{
    // Given
    var command = new CreateOrderCommand(customerId, items);

    // When
    var result = await _mediator.SendAsync(command);

    // Then
    Assert.True(result.IsSuccess);
    var order = await _orderRepository.GetByIdAsync(new OrderId(result.Value));
    Assert.NotNull(order);
}
```

### 3. Rollback Test
```csharp
[Test]
public async Task Should_RollbackTransaction_When_CommandThrows()
{
    // Given
    var command = new CreateOrderCommand(invalidCustomerId, items);
    var initialOrderCount = await _dbContext.Orders.CountAsync();

    // When/Then
    await Assert.ThrowsAsync<DomainException>(
        () => _mediator.SendAsync(command)
    );

    // Then
    var finalOrderCount = await _dbContext.Orders.CountAsync();
    Assert.Equal(initialOrderCount, finalOrderCount);
}
```

### 4. Query Caching Test
```csharp
[Test]
public async Task Should_ReturnCachedResult_When_QueryExecutedTwice()
{
    // Given
    var query = new GetOrderDetailsQuery(existingOrderId);
    var handlerCallCount = 0;
    // Instrument handler to count calls

    // When
    var result1 = await _mediator.SendAsync(query);
    var result2 = await _mediator.SendAsync(query);

    // Then
    Assert.Equal(1, handlerCallCount);  // Handler called only once
    Assert.Equal(result1, result2);     // Same cached instance
}
```

---

## Step 6: Verify Architecture Compliance (2 minutes)

**Purpose**: Ensure query handlers maintain CQRS separation by detecting any state modifications (write operations) through static analysis per Constitution Section II and spec.md edge case requirement.

### Run Architecture Tests

Architecture tests enforce semantic constraints that cannot be validated at runtime. The AT-001 test specifically validates that query handlers do NOT call repository write methods (Add, Update, Delete, Save, etc.).

**C# (.NET)**:
```bash
# Run architecture compliance tests using NetArchTest
dotnet test --filter "FullyQualifiedName~ArchitectureTests"

# Or specifically AT-001
dotnet test --filter "Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes"
```

**Java (Spring Boot)**:
```bash
# Run architecture compliance tests using ArchUnit
mvn test -Dtest=ArchitectureTests

# Or specifically AT-001
mvn test -Dtest=ArchitectureTests#should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes
```

**Go**:
```bash
# Run architecture compliance tests using go/ast parser
go test ./tests/shell/cqrs -run TestShould_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes
```

**TypeScript**:
```bash
# Run architecture compliance tests using TypeScript Compiler API
npm run test:arch

# Or specifically AT-001
npx jest --testNamePattern="Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes"
```

**Python**:
```bash
# Run architecture compliance tests using ast.NodeVisitor
pytest tests/shell/cqrs/test_architecture.py::TestArchitecture::test_should_not_call_repository_write_methods_when_query_handler_executes -v
```

### Understanding AT-001 Failures

If AT-001 fails, you have a query handler calling write methods:

**Example Violation**:
```csharp
// ❌ FAIL - Query modifies state
public class GetOrderDetailsHandler : IQueryHandler<GetOrderDetailsQuery, OrderDto> {
    public async Task<OrderDto> HandleAsync(GetOrderDetailsQuery query, CancellationToken ct) {
        var order = await _repo.GetByIdAsync(query.OrderId, ct);

        order.IncrementViewCount();  // State modification in query!
        await _repo.UpdateAsync(order, ct);  // ← AT-001 FAILS HERE

        return order.ToDto();
    }
}
```

**Fix**: Move state modifications to a command handler:
```csharp
// ✅ PASS - Query only reads
public class GetOrderDetailsHandler : IQueryHandler<GetOrderDetailsQuery, OrderDto> {
    public async Task<OrderDto> HandleAsync(GetOrderDetailsQuery query, CancellationToken ct) {
        var order = await _repo.GetByIdAsync(query.OrderId, ct);  // Read-only
        return order.ToDto();
    }
}

// Create separate command for view count tracking
public class TrackOrderViewCommand : ICommand<Result<Unit>> { }
```

### Why This Matters

- **CQRS Integrity**: Queries with side effects break command/query separation, making system behavior unpredictable
- **Transaction Semantics**: Queries don't open transactions (BR-003), so state modifications may fail or produce inconsistent results
- **Performance**: Read-only queries can use optimized read models, caching, and replication strategies unavailable to write operations
- **Auditability**: State changes in queries are harder to track and audit compared to explicit commands

**For complete AT-001 specification, detection strategies, and edge cases, see**: `/specs/003-architecture-shell-cqrs/contracts/CONTRACT_TESTS.md` (lines 664-942)

---

## Troubleshooting

### Issue: HandlerNotFoundException

**Symptom**: `No handler registered for request type 'CreateOrderCommand'`

**Solution**:
1. Verify handler class implements correct interface: `ICommandHandler<CreateOrderCommand, Result<Guid>>`
2. Check handler is registered in DI: `services.RegisterHandlersFromAssembly(...)`
3. Ensure assembly scanning includes handler's assembly

### Issue: Transaction Not Rolling Back

**Symptom**: Data persisted even when handler throws exception

**Solution**:
1. Verify `UnitOfWorkBehavior` registered with `CommandOnlyMatcher`
2. Check `IUnitOfWork` implementation properly wraps DB transaction
3. Ensure handler throws exception (not returning `Result.Failure` for infrastructure errors)

### Issue: Behaviors Not Executing

**Symptom**: Validation/Authorization skipped

**Solution**:
1. Verify behaviors registered with correct order
2. Check `IBehaviorMatcher` allows behavior for request type
3. Ensure behavior calls `await next()` to continue pipeline

---

## Next Steps

1. **Add Validation Behavior**: Integrate FluentValidation (C#), class-validator (TypeScript), or Hibernate Validator (Java)
2. **Add Authorization Behavior**: Integrate with your authentication/authorization framework
3. **Add Caching Behavior**: Implement query caching with Redis/Memcached
4. **Add Resilience Behavior**: Integrate Polly (C#), resilience4j (Java), or custom retry logic
5. **Integrate Domain Events**: Use EventDispatcher behavior to publish events after transaction commit

---

## Reference

- **Architecture.Core Documentation**: Entity, ValueObject, Repository patterns
- **CQRS Best Practices**: Command/Query separation, transaction boundaries
- **Contract Tests**: See `/contracts/CONTRACT_TESTS.md` for behavioral contracts
- **Data Model**: See `data-model.md` for complete type reference

**Estimated Time to Full Integration**: 30-60 minutes including tests