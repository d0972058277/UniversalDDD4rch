using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Architecture.Core.Domain.Repositories;
using Architecture.Core.Functional;
using QuickstartExample.Domain;

namespace QuickstartExample.Repositories;

public interface IOrderRepository : IRepository<Order, string>
{
    Task<Maybe<Order>> GetByCustomerIdAsync(CustomerId customerId, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Order>>> GetOrdersByStatusAsync(OrderStatus status, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Order>>> GetOrdersForCustomerAsync(CustomerId customerId, CancellationToken cancellationToken = default);
}