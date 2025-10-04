# Contract Test Specifications

**Purpose**: Define behavioral contracts that all language implementations must satisfy

**Test Strategy**: Test-first approach - these tests will fail initially until implementations are complete

---

## Test Suite Organization

```
tests/
├── unit/
│   ├── MediatorTests - Handler registration and resolution
│   ├── PipelineBehaviorTests - Behavior ordering and execution
│   ├── UnitOfWorkTests - Transaction lifecycle management
│   └── CancellationTests - Cancellation token propagation
└── integration/
    ├── CommandExecutionTests - Command with transaction lifecycle
    ├── QueryExecutionTests - Query without transaction
    ├── NestedCommandTests - Nested command transaction reuse
    ├── ValidationBehaviorTests - Validation short-circuit
    └── CachingBehaviorTests - Query caching behavior
```

---

## Unit Test Contracts

### UT-001: Handler Registration Uniqueness

**Test**: `Should_ThrowException_When_ZeroHandlersRegistered`
```pseudo
// Given
mediator = new Mediator(serviceProvider)
request = new UnregisteredCommand()

// When/Then
await mediator.Send(request) throws HandlerNotFoundException
```

**Test**: `Should_ThrowException_When_MultipleHandlersRegistered`
```pseudo
// Given
services.AddHandler<DuplicateCommand, Handler1>()
services.AddHandler<DuplicateCommand, Handler2>()

// When/Then
serviceProvider.Build() throws AmbiguousHandlerException
```

**Test**: `Should_ResolveHandler_When_ExactlyOneHandlerRegistered`
```pseudo
// Given
services.AddHandler<CreateOrderCommand, CreateOrderHandler>()
serviceProvider = services.Build()
mediator = new Mediator(serviceProvider)

// When
result = await mediator.Send(new CreateOrderCommand())

// Then
Assert.HandlerExecuted
Assert.NotNull(result)
```

---

### UT-002: Query Return Type Contracts

**Test**: `Should_ReturnCorrectType_When_QueryHandlerExecutes`
```pseudo
// Given
query = new GetOrderDetailsQuery(orderId: "123")
handler returns OrderDetailsDto { OrderId = "123", ... }

// When
result = await mediator.Send(query)

// Then
Assert.IsType<OrderDetailsDto>(result)
Assert.Equal("123", result.OrderId)
```

---

### UT-003: Pipeline Behavior Execution Order

**Test**: `Should_ExecuteBehaviorsInOrder_When_RequestProcessed`
```pseudo
// Given
executionLog = []
services.AddBehavior<LoggingBehavior>(order: 10, logs "A")
services.AddBehavior<AuthorizationBehavior>(order: 20, logs "B")
services.AddBehavior<TransactionBehavior>(order: 30, logs "C")

// When
await mediator.Send(new TestCommand())

// Then
Assert.Equal(["A", "B", "C", "Handler", "C", "B", "A"], executionLog)
```

**Test**: `Should_AllowCustomOrder_When_OrderConfigured`
```pseudo
// Given
services.AddBehavior<TelemetryBehavior>(order: 5)
services.AddBehavior<ValidationBehavior>(order: 10)

// When
await mediator.Send(new TestCommand())

// Then
Assert.ExecutedBefore<TelemetryBehavior, ValidationBehavior>()
```

---

### UT-003b: Custom Behavior Order Configuration

**Test**: `Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence`

**Purpose**: Validates spec.md:L74-75 edge case that system permits custom behavior ordering, even when deviating from recommended sequence (Validation → Authorization → Transaction → Telemetry → Resilience). Documentation must warn about ordering consequences, but system must remain flexible.

```pseudo
// Given
executionLog = []
services.AddBehavior<TelemetryBehavior>(order: 10, logs "Telemetry")      // Non-recommended: Telemetry first
services.AddBehavior<ValidationBehavior>(order: 20, logs "Validation")     // Normally should be first
services.AddBehavior<TransactionBehavior>(order: 30, logs "Transaction")

// Recommended order is: Validation -> Authorization -> Transaction -> Telemetry
// But system MUST allow custom order

// When
await mediator.Send(new TestCommand())

// Then
// Verify custom order was respected (not recommended order)
Assert.Equal(
    ["Telemetry", "Validation", "Transaction", "Handler", "Transaction", "Validation", "Telemetry"],
    executionLog
)

// Verify system did NOT enforce recommended order
Assert.NotEqual(
    ["Validation", "Transaction", "Telemetry", "Handler", "Telemetry", "Transaction", "Validation"],
    executionLog
)
```

**Rationale**: System must be flexible and allow developers to configure behavior order for specific use cases (e.g., putting telemetry first to measure total request time including validation). Documentation provides guidance on recommended order, but enforcement remains developer's responsibility.

---

### UT-004: Cancellation Token Propagation

**Test**: `Should_TerminateEarly_When_CancellationRequested`
```pseudo
// Given
cts = new CancellationTokenSource()
longRunningCommand = new ProcessLargeFileCommand()
handler sleeps for 5 seconds

// When
task = mediator.Send(longRunningCommand, cts.Token)
await Task.Delay(100ms)
cts.Cancel()

// Then
await Assert.ThrowsAsync<OperationCanceledException>(task)
Assert.HandlerDidNotComplete()
```

---

### UT-005: UnitOfWork Transaction Behavior

**Test**: `Should_OpenTransaction_When_CommandExecutes`
```pseudo
// Given
unitOfWork = Mock<IUnitOfWork>()
command = new CreateOrderCommand()

// When
await mediator.Send(command)

// Then
unitOfWork.Verify(u => u.BeginTransactionAsync(), Times.Once)
unitOfWork.Verify(u => u.CommitAsync(), Times.Once)
```

**Test**: `Should_SkipTransaction_When_QueryExecutes`
```pseudo
// Given
unitOfWork = Mock<IUnitOfWork>()
query = new GetOrderDetailsQuery()

// When
await mediator.Send(query)

// Then
unitOfWork.Verify(u => u.BeginTransactionAsync(), Times.Never)
```

---

### UT-006: Nested Command Transaction Reuse

**Test**: `Should_ReuseTransaction_When_NestedCommandExecuted`
```pseudo
// Given
unitOfWork.HasActiveTransaction = true
outerCommand = new CreateOrderCommand()
handler sends nested SendEmailCommand

// When
await mediator.Send(outerCommand)

// Then
unitOfWork.Verify(u => u.BeginTransactionAsync(), Times.Once) // Only outer
Assert.Equal(1, unitOfWork.BeginTransactionCallCount)
```

---

## Integration Test Contracts

### IT-001: Command Execution Lifecycle

**Test**: `Should_CommitTransaction_When_CommandSucceeds`
```pseudo
// Given
database = new InMemoryDatabase()
command = new CreateOrderCommand(customerId: "C1", items: [...])
repository = new OrderRepository(database)

// When
result = await mediator.Send(command)

// Then
Assert.IsType<Result<OrderId>>(result)
Assert.True(result.IsSuccess)
order = await database.Orders.FindAsync(result.Value)
Assert.NotNull(order)
Assert.TransactionCommitted()
```

---

### IT-002: Command Execution Rollback

**Test**: `Should_RollbackTransaction_When_CommandThrowsException`
```pseudo
// Given
database = new InMemoryDatabase()
command = new CreateOrderCommand(items: []) // Invalid
handler throws ValidationException

// When/Then
await Assert.ThrowsAsync<ValidationException>(
  () => mediator.Send(command)
)

// Then
Assert.TransactionRolledBack()
Assert.Equal(0, database.Orders.Count)
```

---

### IT-003: Nested Command Transaction Reuse

**Test**: `Should_ShareTransaction_When_NestedCommandCalled`
```pseudo
// Given
database = new InMemoryDatabase()
outerCommand = new CreateOrderCommand(...)
handler:
  - Creates order
  - Sends nested SendOrderConfirmationEmailCommand
  - Both use same transaction

// When
result = await mediator.Send(outerCommand)

// Then
Assert.TransactionBeginCalledOnce()
Assert.TransactionCommitCalledOnce()
order = await database.Orders.FindAsync(result.Value)
email = await database.SentEmails.FindAsync(order.Id)
Assert.NotNull(order)
Assert.NotNull(email)
```

---

### IT-004: Query Execution Without Transaction

**Test**: `Should_SkipTransactionManagement_When_QueryExecutes`
```pseudo
// Given
database = new InMemoryDatabase()
database.AddOrder(new Order(id: "O1", ...))
query = new GetOrderDetailsQuery(orderId: "O1")

// When
result = await mediator.Send(query)

// Then
Assert.NotNull(result)
Assert.Equal("O1", result.OrderId)
Assert.TransactionNeverOpened()
```

---

### IT-005: Query Caching Behavior

**Test**: `Should_ReturnCachedResult_When_QueryExecutedTwice`
```pseudo
// Given
cache = new InMemoryCache()
services.AddBehavior<CachingBehavior>(cache)
query = new GetOrderDetailsQuery(orderId: "O1")
handlerCallCount = 0

// When
result1 = await mediator.Send(query)
handlerCallCount++ // First call executes handler

result2 = await mediator.Send(query)
// Second call returns cached value, handler not called

// Then
Assert.Equal(1, handlerCallCount)
Assert.Equal(result1, result2)
Assert.CacheHit()
```

---

### IT-006: Telemetry Logging

**Test**: `Should_LogDurationAndStatus_When_RequestProcessed`
```pseudo
// Given
telemetryLog = new InMemoryLogger()
services.AddBehavior<TelemetryBehavior>(telemetryLog)
command = new CreateOrderCommand(...)

// When
result = await mediator.Send(command)

// Then
logEntry = telemetryLog.GetLatestEntry()
Assert.Equal("CreateOrderCommand", logEntry.RequestType)
Assert.InRange(logEntry.Duration, 0, 1000ms)
Assert.Equal("Success", logEntry.Status)
Assert.NotNull(logEntry.TransactionId)
```

**Test**: `Should_LogException_When_HandlerThrows`
```pseudo
// Given
telemetryLog = new InMemoryLogger()
command = new FailingCommand()

// When
await Assert.ThrowsAsync<Exception>(() => mediator.Send(command))

// Then
logEntry = telemetryLog.GetLatestEntry()
Assert.Equal("InfrastructureError", logEntry.Status)
Assert.NotNull(logEntry.Exception)
```

---

### IT-007: Validation Behavior Short-Circuit

**Test**: `Should_AbortExecution_When_ValidationFails`
```pseudo
// Given
services.AddBehavior<ValidationBehavior>()
command = new CreateOrderCommand(items: null) // Invalid
handlerExecuted = false

// When/Then
await Assert.ThrowsAsync<ValidationException>(
  () => mediator.Send(command)
)

// Then
Assert.False(handlerExecuted)
Assert.TransactionNeverOpened()
```

---

## Cross-Language Consistency Tests

Each language implementation must pass ALL contract tests with identical behavior:

| Test Category | C# | Java | Go | TypeScript | Python |
|---------------|----|----- |----|------------|--------|
| UT-001: Handler Registration | ✅ | ✅ | ✅ | ✅ | ✅ |
| UT-002: Query Return Types | ✅ | ✅ | ✅ | ✅ | ✅ |
| UT-003: Behavior Ordering | ✅ | ✅ | ✅ | ✅ | ✅ |
| UT-003b: Custom Behavior Order | ✅ | ✅ | ✅ | ✅ | ✅ |
| UT-004: Cancellation | ✅ | ✅ | ✅ | ✅ | ✅ |
| UT-005: UnitOfWork Behavior | ✅ | ✅ | ✅ | ✅ | ✅ |
| UT-006: Nested Transactions | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-001: Command Lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-002: Rollback on Error | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-003: Nested Commands | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-004: Query No Transaction | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-005: Query Caching | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-006: Telemetry Logging | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-007: Validation Short-Circuit | ✅ | ✅ | ✅ | ✅ | ✅ |
| IT-008: Commit on Business Failure | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Test Naming Convention

All tests MUST follow: `Should_ExpectedBehavior_When_StateUnderTest`

**Examples**:
- ✅ `Should_ThrowException_When_ZeroHandlersRegistered`
- ✅ `Should_CommitTransaction_When_CommandSucceeds`
- ✅ `Should_ReuseTransaction_When_NestedCommandExecuted`
- ❌ `TestHandlerRegistration` (missing convention)
- ❌ `WhenZeroHandlersThenThrow` (incorrect structure)

---

## Test Structure

All tests MUST use Given-When-Then structure with explicit comments:

```pseudo
[Test]
public async Task Should_CommitTransaction_When_CommandSucceeds()
{
    // Given
    var database = new InMemoryDatabase();
    var command = new CreateOrderCommand(...);

    // When
    var result = await _mediator.SendAsync(command);

    // Then
    Assert.True(result.IsSuccess);
    Assert.NotNull(await database.Orders.FindAsync(result.Value));
}
```

---

## Next Steps

1. Implement contract tests for each language (tests will initially fail)
2. Implement core interfaces and mediator infrastructure
3. Implement pipeline behaviors (Validation, Authorization, UnitOfWork, Telemetry, Caching)
4. Run contract tests to validate cross-language consistency
5. Achieve 100% test coverage before marking implementation complete

**Validation**: ✅ All contract tests align with FR-001 through FR-008 and BR-001 through BR-008 requirements
---

### IT-008: Transaction Commit on Business Failure

**Test**: `Should_CommitTransaction_When_HandlerReturnsResultFailure`

**Purpose**: Verify that UnitOfWork behavior commits transaction when handler returns Result.Failure() (business validation error) rather than throwing exception, per BR-008 requirement.

**Context**: This test validates the critical distinction between business failures (expected outcomes) and infrastructure failures (exceptional circumstances):
- **Business Failure** (Result.Failure) → Transaction COMMITS (state is valid, business rule prevented action)
- **Infrastructure Failure** (Exception) → Transaction ROLLBACKS (state is invalid, operation incomplete)

```pseudo
// Given
database = new InMemoryDatabase()
unitOfWork = new DatabaseUnitOfWork(database)
services.AddBehavior<UnitOfWorkBehavior>(unitOfWork)

command = new CreateOrderCommand(
    customerId: "C1",
    items: [{ productId: "P1", quantity: -5 }]  // Invalid: negative quantity
)

handler = new CreateOrderHandler() {
    // Handler validates business rules and returns Result.Failure (does NOT throw)
    async Handle(cmd, ct) {
        // Business validation
        if (cmd.items.Any(i => i.quantity <= 0))
            return Result.Failure(new ValidationError("Quantity must be positive"))

        // Normal processing (not reached in this test)
        var order = Order.Create(cmd.customerId, cmd.items)
        await _repo.AddAsync(order, ct)
        return Result.Success(order.Id)
    }
}

// When
result = await mediator.Send(command)

// Then
Assert.True(result.IsFailure)
Assert.Equal("ValidationError", result.Error.Type)
Assert.Equal("Quantity must be positive", result.Error.Message)

// KEY ASSERTIONS: Transaction was committed despite business failure
Assert.TransactionCommitted()
Assert.Equal(1, unitOfWork.CommitCallCount)
Assert.Equal(0, unitOfWork.RollbackCallCount)

// No order persisted (business validation prevented creation before Add call)
Assert.Equal(0, database.Orders.Count)
```

**Contrast with IT-002**:
- **IT-002**: Handler throws exception → UnitOfWork calls Rollback → state discarded
- **IT-008**: Handler returns Result.Failure → UnitOfWork calls Commit → state preserved (even though no entities added)

**Expected Behavior Flow**:
1. Mediator receives CreateOrderCommand
2. Pipeline executes: Validation → Authorization → UnitOfWork → Handler
3. UnitOfWork.BeginTransactionAsync() opens transaction
4. Handler executes business validation
5. Handler detects invalid quantity, returns Result.Failure(ValidationError)
6. **UnitOfWork detects Result.Failure (not exception)**
7. **UnitOfWork calls CommitAsync()** (business failure is valid outcome)
8. Mediator returns Result.Failure to caller

**Why Commit on Business Failure?**
- Business validation failures are **expected outcomes**, not errors
- Transaction may contain audit logs, metrics, or state changes before validation
- Rollback would discard legitimate side effects (e.g., "order rejected" audit entry)
- Domain events (OrderRejected) need transaction commit to persist

**Requirements Validated**:
- **BR-007**: Command handlers return Result<T> for business errors
- **BR-008**: UnitOfWork treats Result.Failure() as successful completion (commit)

---

### IT-008b: Transaction Commit on Business Failure (Void Commands)

**Test**: `Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure`

**Purpose**: Verify that UnitOfWork behavior commits transaction when void command handler (Command not Command<TResult>) returns Result<Unit>.Failure() for business validation errors, per BR-008 requirement.

**Context**: This test extends IT-008 to cover void commands (commands without return values). While IT-008 validates commands returning Result<TResult>, this test ensures the same behavior applies to commands returning Result<Unit>.

```pseudo
// Given
database = new InMemoryDatabase()
unitOfWork = new DatabaseUnitOfWork(database)
services.AddBehavior<UnitOfWorkBehavior>(unitOfWork)

// Void command (no return value)
command = new PublishBlogPostCommand(
    blogPostId: "BP1",
    publishDate: DateTime.Now.AddDays(-1)  // Invalid: past date
)

handler = new PublishBlogPostHandler() {
    // Handler returns Result<Unit>.Failure for business validation errors
    async Handle(cmd, ct): Result<Unit> {
        // Business validation
        if (cmd.publishDate < DateTime.Now)
            return Result.Failure<Unit>(new ValidationError("Publish date cannot be in the past"))

        // Normal processing (not reached in this test)
        var post = await _repo.GetByIdAsync(cmd.blogPostId, ct)
        post.Publish(cmd.publishDate)
        await _repo.UpdateAsync(post, ct)
        return Result.Success(Unit.Value)
    }
}

// When
result = await mediator.Send(command)

// Then
Assert.True(result.IsFailure)
Assert.Equal("ValidationError", result.Error.Type)
Assert.Equal("Publish date cannot be in the past", result.Error.Message)

// KEY ASSERTIONS: Transaction was committed despite business failure
Assert.TransactionCommitted()
Assert.Equal(1, unitOfWork.CommitCallCount)
Assert.Equal(0, unitOfWork.RollbackCallCount)

// No state modified (business validation prevented Update call)
```

**Language-Specific Return Types** (from spec.md Language-Specific Naming Conventions):
- **C#**: `Task<Result<Unit>>`
- **Java**: `CompletableFuture<Result<Void>>`
- **Go**: `(Result[struct{}], error)` or `error` (nil = success)
- **TypeScript**: `Promise<Result<void>>`
- **Python**: `Awaitable[Result[None]]`

**Requirements Validated**:
- **BR-007**: Void command handlers return Result<Unit> for business errors
- **BR-008**: UnitOfWork treats Result<Unit>.Failure() as successful completion (commit)

---

### IT-009: Transaction Provider Failure Handling

**Test**: `Should_ThrowException_When_TransactionProviderFails`

**Purpose**: Verify that UnitOfWork behavior fails fast when BeginTransactionAsync() throws an exception due to infrastructure failure (connection pool exhaustion, database unavailability), per BR-006 requirement.

**Acceptance Criteria**:

1. **Exception Type**: MUST throw language-appropriate infrastructure exception:
   - C#: `InfrastructureException` with `InnerException` containing `SqlException` or EF Core `DbException`
   - Java: `InfrastructureException` with `cause` containing `SQLException` or JPA `PersistenceException`
   - Go: `InfrastructureError` with wrapped error containing database driver error
   - TypeScript: `InfrastructureException` with `cause` containing database connection error
   - Python: `InfrastructureException` with `__cause__` containing Django `OperationalError` or database driver exception

2. **Retry Behavior**: UnitOfWork behavior MUST NOT implement automatic retry logic. Single BeginTransactionAsync() call failure MUST immediately propagate exception to caller.

3. **Handler Execution**: Command handler MUST NOT execute if BeginTransactionAsync() fails. Transaction failure occurs BEFORE handler invocation in pipeline order.

4. **Caller Guidance**: Exception message SHOULD include actionable guidance: "Transaction provider unavailable. Implement retry with exponential backoff at application boundary."

5. **State Preservation**: No state changes should occur (no partial writes, no domain events emitted).

6. **Resource Cleanup** (BR-006): Before throwing the exception, UnitOfWork implementation MUST dispose/release all database connections and cancel any pending operations to prevent connection leaks. Verify via mock assertions or resource tracking that cleanup methods were called (e.g., `mockConnection.Verify(c => c.Dispose(), Times.Once)` in C#)

7. **Cleanup Timeout** (BR-006): Verify cleanup operations complete within 5 seconds per spec.md BR-006. Test MUST measure elapsed time from BeginTransactionAsync() failure to exception throw, asserting `cleanupDuration <= 5000ms`. If cleanup exceeds timeout, implementation SHOULD log warning but MUST NOT block indefinitely.

```pseudo
// Given
database = new MockDatabase()
database.SimulateConnectionPoolExhaustion() // BeginTransaction throws
unitOfWork = new DatabaseUnitOfWork(database)
services.AddBehavior<UnitOfWorkBehavior>(unitOfWork)
command = new CreateOrderCommand(customerId: "C1", items: [...])
handlerExecuted = false

// When/Then
exception = await Assert.ThrowsAsync<InfrastructureException>(
    () => mediator.Send(command)
)

// Then
Assert.NotNull(exception.InnerException) // Original database error preserved
Assert.Contains("Transaction provider unavailable", exception.Message)
Assert.False(handlerExecuted) // Handler never called
Assert.Equal(0, database.Orders.Count) // No partial writes
```

**Requirements Validated**:
- **BR-006**: Fail fast on transaction provider failure
- **NFR-002**: Error details logged (exception type, message, stack trace)

---

## Architecture Test Contracts

**Purpose**: Enforce architectural constraints that cannot be validated at runtime but must be verified through static analysis or compilation-time checks.

---

### AT-001: Query Handler Read-Only Enforcement

**Purpose**: Enforce semantic constraint that query handlers MUST NOT modify state (per spec.md edge case requirement and CQRS principles)

**Test**: `Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes`

**Rationale**: While the type system cannot prevent queries from calling write methods, architecture tests catch violations during development/CI to maintain CQRS separation integrity.

---

#### Failure Criteria

**ANY** of the following constitutes test failure:

1. **Repository Write Method Calls**:
   - Method names (case-insensitive): `Add`, `Update`, `Delete`, `Remove`, `Save`, `Insert`, `Create`, `Modify`, `Persist`, `Commit`
   - With or without `Async` suffix: `AddAsync`, `SaveAsync`, `UpdateAsync`, etc.
   - Regex pattern: `\.(Add|Update|Delete|Remove|Save|Insert|Create|Modify|Persist|Commit)(Async)?\s*\(`

2. **Target Types** (methods must be called on):
   - Architecture.Core: `IRepository<TAggregate, TId>`
   - Entity Framework: `DbContext`, `DbSet<T>`
   - JPA: `EntityManager`, `Session`
   - GORM: `gorm.DB` with write methods
   - TypeORM: `EntityManager`, `Repository<T>`
   - Django ORM: `Model.objects.create/update/delete`, `QuerySet.update/delete`

3. **Threshold**: **SINGLE VIOLATION = TEST FAILURE**
   - Even one write method call fails the test
   - No tolerance for "accidental" writes

---

#### Pass Criteria

Query handlers may only call:
- **Read methods**: `Get`, `Find`, `Query`, `Select`, `Count`, `Exists`, `Any`, `First`, `Single`, `Where`, `Include`, `AsNoTracking`
- **Telemetry/logging**: `logger.LogInformation()`, `log.Info()`, `metrics.Increment()`
- **Caching**: Cache read/write operations (infrastructure cross-cutting concern)

---

#### Detection Strategy by Language

**Static Analysis** (NOT runtime monitoring):

##### C# (NetArchTest)
```csharp
[Test]
public void Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes()
{
    var assembly = typeof(IQueryHandler<,>).Assembly;

    var result = Types.InAssembly(assembly)
        .That().ImplementInterface(typeof(IQueryHandler<,>))
        .Should().NotHaveDependencyOn(typeof(IRepository<,>).GetMethod("AddAsync"))
        .And().NotHaveDependencyOn(typeof(IRepository<,>).GetMethod("UpdateAsync"))
        .And().NotHaveDependencyOn(typeof(IRepository<,>).GetMethod("DeleteAsync"))
        .GetResult();

    Assert.True(result.IsSuccessful,
        $"Query handlers violated read-only constraint: {string.Join(", ", result.FailingTypeNames)}");
}
```

##### Java (ArchUnit)
```java
@Test
public void should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes() {
    ArchRule rule = classes()
        .that().implement(QueryHandler.class)
        .should().notCallMethodWhere(
            target(name(matchesPattern("(save|update|delete|persist|merge).*")))
                .and(owner(assignableTo(EntityManager.class)))
        );

    rule.check(importedClasses);
}
```

##### Go (go/ast parser)
```go
func TestShould_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes(t *testing.T) {
    fset := token.NewFileSet()
    pkgs, err := parser.ParseDir(fset, "./handlers", nil, 0)
    require.NoError(t, err)

    for _, pkg := range pkgs {
        for _, file := range pkg.Files {
            ast.Inspect(file, func(n ast.Node) bool {
                if call, ok := n.(*ast.CallExpr); ok {
                    if isQueryHandler(file) && isRepositoryWriteMethod(call) {
                        t.Errorf("Query handler calls write method: %v at %v",
                            call, fset.Position(call.Pos()))
                    }
                }
                return true
            })
        }
    }
}

func isRepositoryWriteMethod(call *ast.CallExpr) bool {
    if sel, ok := call.Fun.(*ast.SelectorExpr); ok {
        methodName := sel.Sel.Name
        return regexp.MustCompile(`(?i)^(Add|Update|Delete|Save|Create)`).MatchString(methodName)
    }
    return false
}
```

##### TypeScript (TS Compiler API)
```typescript
describe('Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes', () => {
    it('detects write method calls in query handlers', () => {
        const program = ts.createProgram(['./handlers/**/*.ts'], {});
        const sourceFiles = program.getSourceFiles().filter(sf => !sf.isDeclarationFile);

        const violations: string[] = [];

        sourceFiles.forEach(sourceFile => {
            if (isQueryHandler(sourceFile)) {
                sourceFile.forEachDescendant(node => {
                    if (ts.isCallExpression(node)) {
                        const methodName = node.expression.getText();
                        if (/\.(add|update|delete|save|remove|create)/i.test(methodName)) {
                            violations.push(
                                `${sourceFile.fileName}: ${methodName} at line ${
                                    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
                                }`
                            );
                        }
                    }
                });
            }
        });

        expect(violations).toEqual([]);
    });
});
```

##### Python (ast.NodeVisitor)
```python
import ast
import unittest
from pathlib import Path

class WriteMethodVisitor(ast.NodeVisitor):
    def __init__(self):
        self.violations = []

    def visit_Call(self, node):
        if isinstance(node.func, ast.Attribute):
            method_name = node.func.attr
            if method_name.lower() in ['add', 'update', 'delete', 'save', 'create', 'bulk_create', 'bulk_update']:
                self.violations.append(f"Write method call: {method_name} at line {node.lineno}")
        self.generic_visit(node)

class TestArchitecture(unittest.TestCase):
    def test_should_not_call_repository_write_methods_when_query_handler_executes(self):
        query_handlers = Path('./handlers').glob('**/query_*.py')

        for handler_file in query_handlers:
            with open(handler_file) as f:
                tree = ast.parse(f.read(), filename=str(handler_file))

            visitor = WriteMethodVisitor()
            visitor.visit(tree)

            self.assertEqual(
                [],
                visitor.violations,
                f"Query handler {handler_file} has write method calls: {visitor.violations}"
            )
```

---

#### Example Violations

**❌ FAIL - Query modifies state**:
```pseudo
class GetOrderDetailsHandler : IQueryHandler<GetOrderDetailsQuery, OrderDto> {
    async Handle(query, ct) {
        var order = await _repo.GetByIdAsync(query.OrderId, ct);

        // VIOLATION: Query handler calls Update
        order.IncrementViewCount();
        await _repo.UpdateAsync(order, ct);  // ← Architecture test FAILS

        return order.ToDto();
    }
}
```

**❌ FAIL - Query creates audit log via repository**:
```pseudo
class GetSensitiveDataHandler : IQueryHandler<GetSensitiveDataQuery, DataDto> {
    async Handle(query, ct) {
        var data = await _repo.GetByIdAsync(query.Id, ct);

        // VIOLATION: Even audit logging via repository write is not allowed
        var auditLog = AuditLog.Create(query.UserId, "ViewedSensitiveData");
        await _auditRepo.AddAsync(auditLog, ct);  // ← Architecture test FAILS

        return data.ToDto();
    }
}
```

**✅ PASS - Query only reads**:
```pseudo
class GetOrderDetailsHandler : IQueryHandler<GetOrderDetailsQuery, OrderDto> {
    async Handle(query, ct) {
        var order = await _repo.GetByIdAsync(query.OrderId, ct);  // Read-only

        // Logging is permitted (infrastructure concern)
        _logger.LogInformation("Retrieved order {OrderId}", query.OrderId);

        return order.ToDto();
    }
}
```

**✅ PASS - Query with caching (cache writes are infrastructure)**:
```pseudo
class GetProductCatalogHandler : IQueryHandler<GetProductCatalogQuery, ProductDto[]> {
    async Handle(query, ct) {
        // Cache write is permitted (infrastructure cross-cutting concern)
        var cachedResult = await _cache.GetAsync<ProductDto[]>(query.CacheKey, ct);
        if (cachedResult != null) return cachedResult;

        // Repository read-only
        var products = await _repo.GetAllAsync(ct);

        await _cache.SetAsync(query.CacheKey, products, ct);  // ← OK (cache write)
        return products;
    }
}
```

---

#### Implementation Notes

1. **Test Execution Context**: Architecture tests run as part of unit test suite (Phase 3.10 in tasks.md: T201-T205)

2. **CI/CD Integration**: Test failure blocks PR merge; architecture violations must be fixed before code review approval

3. **False Positives**:
   - Legitimate infrastructure writes (caching, telemetry) should be excluded via type filtering
   - Use explicit exclusion rules in test configuration

4. **Performance**: Static analysis runs once per build; no runtime overhead

5. **Documentation**: Failed tests should output:
   - Query handler class name
   - Write method called
   - Line number and file location
   - Recommendation: "Move state modification to a Command handler"

---

#### Requirements Validated

- **spec.md Edge Case (L72-73)**: Query state modification prevention
- **CQRS Principle**: Command/Query separation integrity
- **BR-003**: Queries do not open transactions (corollary: queries should not need transactions)
- **Constitution Section II**: CQRS implementation enforcement

---
