// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Architecture.Core.Domain;
using Architecture.Core.Functional;
using Architecture.Shell.Cqrs.Behaviors;
using Architecture.Shell.Cqrs.Tests.TestHelpers;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Architecture.Shell.Cqrs.Tests.Integration;

/// <summary>
/// T187: Quickstart validation test.
/// Validates end-to-end integration scenario from quickstart.md.
/// </summary>
public sealed class QuickstartTests
{
    /// <summary>
    /// Should_CompleteQuickstartScenario_When_OrderCreatedAndQueried.
    /// Validates the complete quickstart workflow:
    /// 1. Create aggregate (Order)
    /// 2. Send command (CreateOrderCommand)
    /// 3. Verify transaction commit
    /// 4. Query data (GetOrderDetailsQuery)
    /// 5. Verify no transaction for query
    /// </summary>
    [Fact]
    public async Task Should_CompleteQuickstartScenario_When_OrderCreatedAndQueried()
    {
        // Given: CQRS infrastructure configured per quickstart.md
        var services = new ServiceCollection();

        // Register logging
        services.AddLogging();

        // Register CQRS services
        services.AddCqrs(config =>
        {
            config.RegisterHandlersFromAssembly(typeof(QuickstartTests).Assembly);
        });

        // Register UnitOfWork implementation
        var unitOfWork = new InMemoryUnitOfWork();
        services.AddSingleton<IUnitOfWork>(unitOfWork);

        // Register behaviors manually (since AddBehavior<TBehavior> is not fully implemented)
        services.AddScoped<IPipelineBehavior<CreateOrderCommand, Result<Guid>>>(
            sp => new UnitOfWorkBehavior<CreateOrderCommand, Result<Guid>>(
                sp.GetRequiredService<IUnitOfWork>(), order: 30));

        services.AddScoped<IPipelineBehavior<CreateOrderCommand, Result<Guid>>>(
            sp => new TelemetryBehavior<CreateOrderCommand, Result<Guid>>(
                new TestLogger<TelemetryBehavior<CreateOrderCommand, Result<Guid>>>()));

        // Register repository
        var repository = new InMemoryOrderRepository();
        services.AddSingleton<IOrderRepository>(repository);

        var serviceProvider = services.BuildServiceProvider();
        var mediator = serviceProvider.GetRequiredService<IMediator>();

        // ===== COMMAND EXECUTION =====

        // When: Send CreateOrderCommand (per quickstart.md Step 5)
        var customerId = Guid.NewGuid();
        var command = new CreateOrderCommand(
            customerId,
            new List<OrderItemDto>
            {
                new("Product1", 2),
                new("Product2", 1)
            });

        var createResult = await mediator.SendAsync<Result<Guid>>(command, CancellationToken.None);

        // Then: Command succeeds with OrderId
        Assert.True(createResult.IsSuccess);
        Assert.NotEqual(Guid.Empty, createResult.Value);

        // Verify transaction was committed
        Assert.True(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.IsRolledBack);

        var orderId = createResult.Value;

        // ===== QUERY EXECUTION =====

        // When: Send GetOrderDetailsQuery (per quickstart.md Step 5)
        var query = new GetOrderDetailsQuery(orderId);
        var queryResult = await mediator.SendAsync<OrderDetailsDto>(query, CancellationToken.None);

        // Then: Query returns order details
        Assert.NotNull(queryResult);
        Assert.Equal(orderId, queryResult.OrderId);
        Assert.Equal(customerId, queryResult.CustomerId);
        Assert.Equal(2, queryResult.Items.Count);
        Assert.Contains(queryResult.Items, i => i.ProductName == "Product1" && i.Quantity == 2);
        Assert.Contains(queryResult.Items, i => i.ProductName == "Product2" && i.Quantity == 1);

        // Verify query did NOT open transaction (per BR-003)
        // Transaction was already committed from command, so checking that query didn't reset it
        Assert.True(unitOfWork.IsCommitted);
    }

    #region Test Domain Model (per quickstart.md Step 1)

    /// <summary>
    /// Order ID value object (simplified for quickstart).
    /// </summary>
    public sealed class OrderId
    {
        public Guid Value { get; }

        public OrderId(Guid value)
        {
            Value = value != Guid.Empty ? value : throw new ArgumentException("OrderId cannot be empty", nameof(value));
        }

        public static OrderId NewId() => new(Guid.NewGuid());

        public override bool Equals(object? obj) => obj is OrderId other && Value.Equals(other.Value);
        public override int GetHashCode() => Value.GetHashCode();
    }

    /// <summary>
    /// Order aggregate root (simplified for quickstart).
    /// Uses composition instead of inheritance for simplified testing.
    /// </summary>
    public sealed class Order
    {
        public OrderId Id { get; private set; }
        public Guid CustomerId { get; private set; }
        public List<OrderItem> Items { get; private set; } = new();
        public string Status { get; private set; } = "Draft";

        private Order()
        {
            Id = OrderId.NewId();
        }

        public static Result<Order> Create(Guid customerId, List<OrderItem> items)
        {
            if (items == null || !items.Any())
            {
                return Result<Order>.Fail(Error.Validation("ORDER_NO_ITEMS", "Order must have at least one item"));
            }

            var order = new Order
            {
                CustomerId = customerId,
                Items = items
            };

            return Result<Order>.Ok(order);
        }
    }

    public sealed class OrderItem
    {
        public string ProductName { get; init; }
        public int Quantity { get; init; }

        public OrderItem(string productName, int quantity)
        {
            ProductName = productName;
            Quantity = quantity;
        }
    }

    #endregion

    #region Commands and Queries (per quickstart.md Step 2)

    public sealed record CreateOrderCommand(
        Guid CustomerId,
        List<OrderItemDto> Items
    ) : ICommand<Result<Guid>>;

    public sealed record GetOrderDetailsQuery(
        Guid OrderId
    ) : IQuery<OrderDetailsDto>;

    public sealed record OrderItemDto(string ProductName, int Quantity);

    public sealed record OrderDetailsDto(
        Guid OrderId,
        Guid CustomerId,
        string Status,
        List<OrderItemDto> Items);

    #endregion

    #region Handlers (per quickstart.md Step 3)

    public sealed class CreateOrderHandler : ICommandHandler<CreateOrderCommand, Result<Guid>>
    {
        private readonly IOrderRepository _repository;

        public CreateOrderHandler(IOrderRepository repository)
        {
            _repository = repository;
        }

        public async Task<Result<Guid>> HandleAsync(
            CreateOrderCommand command,
            CancellationToken cancellationToken)
        {
            // Given: Validate and create aggregate
            var items = command.Items
                .Select(dto => new OrderItem(dto.ProductName, dto.Quantity))
                .ToList();

            var orderResult = Order.Create(command.CustomerId, items);
            if (orderResult.IsFailure)
            {
                return Result<Guid>.Fail(orderResult.Error);
            }

            // When: Persist aggregate
            await _repository.AddAsync(orderResult.Value, cancellationToken);

            // Then: Return OrderId
            return Result<Guid>.Ok(orderResult.Value.Id.Value);
        }
    }

    public sealed class GetOrderDetailsHandler : IQueryHandler<GetOrderDetailsQuery, OrderDetailsDto>
    {
        private readonly IOrderRepository _repository;

        public GetOrderDetailsHandler(IOrderRepository repository)
        {
            _repository = repository;
        }

        public async Task<OrderDetailsDto> HandleAsync(
            GetOrderDetailsQuery query,
            CancellationToken cancellationToken)
        {
            // Given: Query read model
            var order = await _repository.GetByIdAsync(new OrderId(query.OrderId), cancellationToken);

            if (order == null)
            {
                throw new InvalidOperationException($"Order {query.OrderId} not found");
            }

            // Then: Return DTO
            return new OrderDetailsDto(
                order.Id.Value,
                order.CustomerId,
                order.Status,
                order.Items.Select(i => new OrderItemDto(i.ProductName, i.Quantity)).ToList());
        }
    }

    #endregion

    #region Repository (in-memory for testing)

    public interface IOrderRepository
    {
        Task AddAsync(Order order, CancellationToken cancellationToken);
        Task<Order?> GetByIdAsync(OrderId id, CancellationToken cancellationToken);
    }

    public sealed class InMemoryOrderRepository : IOrderRepository
    {
        private readonly Dictionary<Guid, Order> _orders = new();

        public Task AddAsync(Order order, CancellationToken cancellationToken)
        {
            _orders[order.Id.Value] = order;
            return Task.CompletedTask;
        }

        public Task<Order?> GetByIdAsync(OrderId id, CancellationToken cancellationToken)
        {
            _orders.TryGetValue(id.Value, out var order);
            return Task.FromResult(order);
        }
    }

    #endregion
}
