# Architecture.Shell Requirements Specification

## Overview

Architecture.Shell is a cross-platform core framework for application layer architecture, providing fundamental abstractions for CQRS, event-driven architecture, and distributed system support. This document is based on SDD (Software Design Document) specifications, detailing the functional requirements and technical specifications of Architecture.Shell, applicable to implementations across various programming languages and technology stacks.

> **Implementation Reference**: This specification uses .NET implementations as examples, but the architectural design has cross-platform universality and can be applied to technology stacks such as Java, Python, Node.js, Go, etc.

## System Architecture Overview

Architecture.Shell provides the following core modules:

- **CQRS Module**: Command Query Responsibility Segregation pattern implementation
- **EventBus Module**: Event-driven architecture support (Inbox/Outbox patterns)
- **Correlation Module**: Distributed system correlation tracking
- **Base Service Interfaces**: UnitOfWork, ApplicationService

## Functional Requirements

### 1. CQRS Module (Command Query Responsibility Segregation)

#### 1.1 Command Pattern

**Interface Specifications:**
```csharp
public interface IBaseCommand { }
public interface ICommand<out TResult> : IBaseCommand, IRequest<TResult> { }
public interface ICommand : IBaseCommand, IRequest { }
```

**Handler Specifications:**
```csharp
public interface ICommandHandler<in TCommand> : IRequestHandler<TCommand> where TCommand : ICommand { }
public interface ICommandHandler<in TCommand, TResult> : IRequestHandler<TCommand, TResult> where TCommand : ICommand<TResult> { }
```

**Functional Requirements:**
- Support commands with and without return values
- Integration with mediator pattern frameworks for command dispatching (e.g., Mediator/.NET, Spring Framework/Java, etc.)
- Provide type-safe command handler constraints
- Support generic and polymorphic command definitions

#### 1.2 Query Pattern

**Interface Specifications:**
```csharp
public interface IBaseQuery { }
public interface IQuery<out TResult> : IBaseQuery, IRequest<TResult> { }
```

**Handler Specifications:**
```csharp
public interface IQueryHandler<in TQuery, TResult> : IRequestHandler<TQuery, TResult> where TQuery : IQuery<TResult> { }
```

**Functional Requirements:**
- Queries must have explicit return types
- Support complex query object encapsulation
- Integration with mediator pattern for query dispatching
- Support pagination, sorting, filtering, and other query semantics

#### 1.3 Mediator Pattern

**Interface Specifications:**
```csharp
public interface IMediator { }
```

**Functional Requirements:**
- Encapsulate mediator framework implementations (.NET: Mediator, Java: Spring, Python: Custom, etc.)
- Provide unified entry point for commands and queries
- Support pipeline behaviors/interceptors
- Support dependency injection and lifecycle management

#### 1.4 Pipeline Behaviors

**UnitOfWork Behavior Implementation Specifications:**

```csharp
public class UnitOfWorkBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UnitOfWorkBehavior<TRequest, TResponse>> _logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // Enable transaction management only for commands, queries don't need it
        if (request is IBaseCommand)
            return await HandleCommand(request, next, cancellationToken);
        else
            return await next();
    }
}
```

**Core Functional Requirements:**
- **Automatic Transaction Management**: Commands automatically enable database transactions, queries execute directly
- **Nested Transaction Support**: Check for existing active transactions to avoid duplicate opening
- **Transaction State Tracking**: Record transaction start, commit, duration and other key information
- **Exception Handling**: Automatic rollback on transaction failure with detailed error logging
- **Performance Monitoring**: Record transaction commit duration for performance analysis
- **Cancellation Support**: Integration with CancellationToken for graceful interruption

**Implementation Patterns:**
1. **Transaction Check**: Use `HasActiveTransaction` to determine if there's an active transaction
2. **New Transaction Flow**: `BeginTransaction` → Execute Command → `CommitAsync`
3. **Nested Transaction Flow**: Execute command directly without duplicate transaction management
4. **Logging Tracking**: Complete recording of transaction lifecycle and performance metrics

### 2. EventBus Module

#### 2.1 Integration Events

**Base Interface:**
```csharp
public interface IIntegrationEvent
{
    Guid Id { get; init; }
    DateTime CreationTimestamp { get; init; }
}
```

**Event Handler:**
```csharp
public interface IIntegrationEventHandler<in T> where T : IIntegrationEvent
{
    Task HandleAsync(T integrationEvent, CancellationToken cancellationToken);
}
```

**Functional Requirements:**
- Events must have unique identifiers
- Events must record creation timestamps
- Support asynchronous event processing
- Provide cancellation token support

#### 2.2 Outbox Pattern

**Core Interface:**
```csharp
public interface IOutbox
{
    Task PublishAsync<TIntegrationEvent>(TIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
        where TIntegrationEvent : IIntegrationEvent;
}
```

**Supporting Interfaces:**
- `IOutboxWorker`: Background processor
- `IEventPublisher`: Event publisher
- `IFireAndForgetService`: Fire-and-forget service
- `IIntegrationEventRepository`: Event persistence
- `OutboxDecoratorUnitOfWork`: UnitOfWork decorator

**Functional Requirements:**
- Ensure reliable event delivery
- Support event state management (Pending, Processing, Completed, Failed)
- Provide retry mechanisms
- Integration with UnitOfWork to ensure transactional consistency

#### 2.3 Inbox Pattern

**Core Interface:**
```csharp
public interface IInbox
{
    Task ConsumeAsync<TIntegrationEvent>(TIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
        where TIntegrationEvent : IIntegrationEvent;
}
```

**Supporting Interfaces:**
- `IInboxWorker`: Background processor
- `IEventConsumer`: Event consumer
- `IIntegrationEventRepository`: Event persistence

**Functional Requirements:**
- Prevent duplicate processing of the same event
- Support event state tracking
- Provide error handling and retry mechanisms
- Ensure at-least-once processing semantics

#### 2.4 Event Entities

**State Management:**
```csharp
public enum State
{
    Pending,
    Processing,
    Completed,
    Failed
}
```

**Entity Specifications:**
- Event serialization/deserialization
- State change tracking
- Retry count management
- Error message logging

### 3. Correlation Module (Correlation Tracking)

#### 3.1 Core Service Interfaces

**Correlation Service:**
```csharp
public interface ICorrelationService : IApplicationService
{
    Guid CorrelationId { get; }
}
```

**Context Accessor:**
```csharp
public interface ICorrelationContextAccessor
{
    CorrelationContext? CorrelationContext { get; set; }
}
```

**Context Factory:**
```csharp
public interface ICorrelationContextFactory : IDisposable
{
    CorrelationContext Create(string correlationId, string header);
}
```

#### 3.2 Correlation Context

**Context Class:**
```csharp
public class CorrelationContext
{
    public const string DefaultCorrelationId = "Not set";

    public CorrelationContext(string correlationId, string header);
    public string CorrelationId { get; }
    public string Header { get; }
}
```

**Configuration Options:**
```csharp
public class CorrelationIdOptions
{
    public const string DefaultHeader = "X-Correlation-ID";
    public const string LoggerScopeKey = "CorrelationId";

    public string RequestHeader { get; set; }
    public string ResponseHeader { get; set; }
    public bool IgnoreRequestHeader { get; set; }
    public bool EnforceHeader { get; set; }
    public bool AddToLoggingScope { get; set; }
    public string LoggingScopeKey { get; set; }
    public bool IncludeInResponse { get; set; }
    public bool UpdateTraceIdentifier { get; set; }
    public Func<string>? CorrelationIdGenerator { get; set; }
}
```

#### 3.3 Cross-Protocol Propagation Support

**Propagator Interface:**
```csharp
public interface ICorrelationPropagator
{
    void Inject<TMetadata>(TMetadata metadata) where TMetadata : class;
    string? Extract<TMetadata>(TMetadata metadata) where TMetadata : class;
}
```

**Protocol Handler Interface:**
```csharp
public interface ICorrelationProtocolHandler
{
    Type MetadataType { get; }
    void Inject(object metadata, string headerName, string correlationId);
    string? Extract(object metadata, string headerName);
}
```

#### 3.4 Multi-Protocol Support

**Supported Protocols:**
- **HTTP**: Correlation propagation through `HttpHeaders`
- **gRPC**: Correlation propagation through `Metadata`
- **RabbitMQ**: Correlation propagation through `IBasicProperties.Headers`
- **Kafka**: Correlation propagation through Kafka Headers

**Functional Requirements:**
- Automatic HTTP request/response header handling
- gRPC interceptor integration
- Message queue header injection/extraction
- Extensible protocol handler architecture
- Asynchronous context propagation guarantee
- Automatic logging scope integration
- ASP.NET Core TraceIdentifier synchronization
- Optional header enforcement validation

### 4. Base Service Interfaces

#### 4.1 Application Service

**Interface Specifications:**
```csharp
public interface IApplicationService { }
```

**Functional Positioning:**
IApplicationService is primarily used to mark application layer services outside the CQRS scope, handling operations that are not suitable for the command/query pattern.

**Applicable Scenarios:**
- **External API Integration**: Third-party service calls, RESTful API consumption, Web Service integration
- **Special Query Operations**: Complex cross-aggregate queries, report generation, data export/import
- **Infrastructure Services**: File processing, email sending, message notifications, cache management
- **Coordination Operations**: Workflow coordination, multi-step business processes, compensating operations
- **System Management Functions**: Health checks, monitoring metrics, configuration management, cleanup tasks

**Distinction from CQRS:**
- **Commands/Queries**: Domain business operations that follow strict CQRS patterns
- **Application Services**: Cross-boundary coordination operations not constrained by CQRS

**Implementation Example Scenarios:**
```csharp
// External integration service
public interface IPaymentGatewayService : IApplicationService
{
    Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request);
}

// Infrastructure service
public interface INotificationService : IApplicationService
{
    Task SendEmailAsync(string to, string subject, string body);
}

// Coordination service
public interface IOrderProcessingCoordinator : IApplicationService
{
    Task<bool> ProcessOrderWorkflowAsync(OrderId orderId);
}

// Special query service
public interface IReportingService : IApplicationService
{
    Task<byte[]> GenerateMonthlyReportAsync(int year, int month);
}
```

**Functional Requirements:**
- Mark application layer service categories
- Support dependency injection identification and lifecycle management
- Provide unified service contracts and interface specifications
- Distinguish operational boundaries inside and outside CQRS

#### 4.2 Unit of Work

**Interface Specifications:**
```csharp
public interface IUnitOfWork
{
    Guid? TransactionId { get; }
    bool HasActiveTransaction { get; }
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitAsync(CancellationToken cancellationToken = default);
}
```

**Functional Requirements:**
- Manage database transaction lifecycle
- Support transaction state queries
- Provide asynchronous transaction operations
- Integration with cancellation token support

## Technical Specifications

### Namespace Structure

```
Architecture.Shell
├── CQRS
│   ├── Behavior/
│   ├── ICommand.cs
│   ├── ICommandHandler.cs
│   ├── IQuery.cs
│   ├── IQueryHandler.cs
│   ├── IMediator.cs
│   └── Mediator.cs
├── EventBus
│   ├── Inbox/
│   ├── Outbox/
│   ├── IIntegrationEvent.cs
│   ├── IIntegrationEventHandler.cs
│   └── Payload.cs
├── Correlation
│   ├── ICorrelationService.cs
│   ├── CorrelationService.cs
│   ├── ICorrelationContextAccessor.cs
│   ├── CorrelationContextAccessor.cs
│   ├── ICorrelationContextFactory.cs
│   ├── CorrelationContextFactory.cs
│   ├── CorrelationContext.cs
│   ├── CorrelationIdOptions.cs
│   ├── ICorrelationPropagator.cs
│   ├── CorrelationPropagator.cs
│   ├── ICorrelationProtocolHandler.cs
│   ├── CorrelationMiddleware.cs
│   ├── CorrelationApplicationBuilderExtensions.cs
│   ├── CorrelationServiceCollectionExtensions.cs
│   ├── Http/
│   │   ├── HttpCorrelationHandler.cs
│   │   └── HttpCorrelationProtocolHandler.cs
│   ├── Grpc/
│   │   ├── GrpcCorrelationInterceptor.cs
│   │   └── GrpcCorrelationProtocolHandler.cs
│   └── Messaging/
│       ├── RabbitMqCorrelationIntegration.cs
│       ├── RabbitMqCorrelationProtocolHandler.cs
│       ├── KafkaCorrelationIntegration.cs
│       └── KafkaCorrelationProtocolHandler.cs
├── IApplicationService.cs
└── IUnitOfWork.cs
```

### Design Principles

1. **Single Responsibility Principle**: Each interface focuses on a single function
2. **Open-Closed Principle**: Support extension without modifying existing interfaces
3. **Interface Segregation Principle**: Provide fine-grained interface definitions
4. **Dependency Inversion Principle**: Depend on abstractions rather than concrete implementations
5. **Async-First**: All I/O operations support asynchronous patterns
   - .NET: async/await + CancellationToken
   - Go: Goroutines + Context
   - Java: CompletableFuture + Timeout
   - Python: asyncio + asyncio.timeout
   - TypeScript: Promises/async-await + AbortController
6. **Cross-Platform Compatibility**: Core concepts can be ported across technology stacks
7. **Type Safety**: Utilize type systems of various languages to ensure compile-time safety

## Implementation Guidelines (TDD Approach)

### Phase 1: Core Interfaces
1. **Test Preparation**
   - Create unit tests for base service interfaces (IApplicationService, IUnitOfWork)
   - Create test cases for CQRS core interfaces (ICommand, IQuery, ICommandHandler, IQueryHandler)
   - Define test data and Mock objects
2. **Implementation Development**
   - Implement base service interfaces to pass tests
   - Implement CQRS core interfaces to pass tests
3. **Refactoring Optimization**
   - Optimize interface design based on test results
   - Ensure test coverage meets standards

### Phase 2: Event System
1. **Test Preparation**
   - Create test cases for Integration Event interfaces and handlers
   - Create unit tests and integration tests for Outbox/Inbox patterns
   - Create test cases for event state management
   - Set up test database and message queue environments
2. **Implementation Development**
   - Implement Integration Event interfaces and handlers to pass tests
   - Implement Outbox pattern interfaces to pass tests
   - Implement Inbox pattern interfaces to pass tests
   - Create event state management to pass tests
3. **Refactoring Optimization**
   - Optimize event processing performance
   - Ensure reliable event delivery

### Phase 3: Correlation System
1. **Test Preparation**
   - Create unit tests for core Correlation interfaces
   - Create integration tests for cross-protocol propagation (HTTP/gRPC/message queues)
   - Create test cases for middleware and extension methods
   - Create test verification for logging scope and TraceIdentifier
2. **Implementation Development**
   - Implement core Correlation interfaces to pass tests
   - Create CorrelationContext and configuration options to pass tests
   - Implement protocol propagator and handler architecture to pass tests
   - Create protocol handlers to pass tests
   - Implement middleware and extension methods to pass tests
   - Integrate logging scope and TraceIdentifier support to pass tests
3. **Refactoring Optimization**
   - Optimize correlation tracking performance
   - Ensure cross-service propagation accuracy

### Phase 4: Advanced Features
1. **Test Preparation**
   - Create unit tests and integration tests for Pipeline Behaviors
   - Create transaction test cases for UnitOfWork decorator
   - Create concurrency tests and reliability tests for background workers
   - Create stability test cases for background workers
2. **Implementation Development**
   - Create Pipeline Behaviors to pass tests
   - Implement UnitOfWork decorator to pass tests
   - Create background workers to pass tests
   - Implement caching mechanisms to pass tests
3. **Refactoring Optimization**
   - Perform optimization based on test results
   - Ensure system stability and scalability

### Phase 5: Test Acceptance
1. **Complete Test Verification**
   - Verify all unit tests pass (>90% coverage)
   - Verify all integration tests pass
   - Verify architecture tests pass (dependencies, naming conventions, etc.)

## Summary

This specification defines the complete functional requirements and technical specifications for Architecture.Shell, covering all core functions of CQRS, event-driven architecture, and distributed system support.

**Cross-Platform Applicability**:
- Core architectural concepts can be applied to mainstream technology stacks such as .NET, Go, Java Spring, Python Django, TypeScript Node.js, etc.
- Each technology stack can adjust specific implementation details according to language characteristics
- C# sample code can serve as reference for implementation in other languages

**Implementation Recommendations**:
- Follow DDD principles to ensure high cohesion and low coupling architectural design
- Make good use of type systems and concurrency features of various languages
- Maintain consistent abstract interfaces across services
- Provide extensible enterprise-level application framework foundation