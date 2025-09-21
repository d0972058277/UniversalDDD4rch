import { Result, Maybe, Error } from '../../../src/functional';
import { Order, OrderId, CustomerId } from '../../domain/entities/order';
import { OrderStatus } from '../../domain/value-objects/order-status';
import {
    IOrderRepository,
    OrderStatistics,
    ProductStatistic
} from '../../application/interfaces/order-repository';

/**
 * In-memory implementation of IOrderRepository for testing and examples
 * Demonstrates repository pattern implementation with full async support
 */
export class InMemoryOrderRepository implements IOrderRepository {
    private readonly orders = new Map<string, Order>();
    private readonly customerIndex = new Map<string, Set<string>>();
    private readonly statusIndex = new Map<string, Set<string>>();

    /**
     * Get order by ID
     */
    public async getByIdAsync(
        id: OrderId,
        cancellationToken?: AbortSignal
    ): Promise<Result<Maybe<Order>>> {
        try {
            this.checkCancellation(cancellationToken);

            const order = this.orders.get(id.value);
            return Result.ok(order ? Maybe.some(order) : Maybe.none());

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.GetByIdFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Add new order
     */
    public async addAsync(
        aggregate: Order,
        cancellationToken?: AbortSignal
    ): Promise<Result> {
        try {
            this.checkCancellation(cancellationToken);

            if (this.orders.has(aggregate.id.value)) {
                return Result.fail(Error.infrastructure(
                    'Repository.DuplicateId',
                    `Order with ID ${aggregate.id.value} already exists`
                ));
            }

            // Clone the order to simulate persistence
            const clonedOrder = this.cloneOrder(aggregate);
            this.orders.set(aggregate.id.value, clonedOrder);

            // Update indexes
            this.updateIndexes(clonedOrder);

            // Clear events after persistence
            aggregate.clearEvents();

            return Result.ok();

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.AddFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Update existing order
     */
    public async updateAsync(
        aggregate: Order,
        cancellationToken?: AbortSignal
    ): Promise<Result> {
        try {
            this.checkCancellation(cancellationToken);

            const existingOrder = this.orders.get(aggregate.id.value);
            if (!existingOrder) {
                return Result.fail(Error.infrastructure(
                    'Repository.NotFound',
                    `Order with ID ${aggregate.id.value} not found`
                ));
            }

            // Optimistic concurrency check
            if (existingOrder.version !== aggregate.version - 1) {
                return Result.fail(Error.concurrency(
                    'Repository.ConcurrencyConflict',
                    `Expected version ${aggregate.version - 1}, but found ${existingOrder.version}`
                ));
            }

            // Remove from old indexes
            this.removeFromIndexes(existingOrder);

            // Clone and store the updated order
            const clonedOrder = this.cloneOrder(aggregate);
            this.orders.set(aggregate.id.value, clonedOrder);

            // Update indexes
            this.updateIndexes(clonedOrder);

            // Clear events after persistence
            aggregate.clearEvents();

            return Result.ok();

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.UpdateFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Delete order by ID
     */
    public async deleteAsync(
        id: OrderId,
        cancellationToken?: AbortSignal
    ): Promise<Result> {
        try {
            this.checkCancellation(cancellationToken);

            const order = this.orders.get(id.value);
            if (!order) {
                return Result.fail(Error.infrastructure(
                    'Repository.NotFound',
                    `Order with ID ${id.value} not found`
                ));
            }

            // Remove from indexes
            this.removeFromIndexes(order);

            // Remove from main storage
            this.orders.delete(id.value);

            return Result.ok();

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.DeleteFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Check if order exists
     */
    public async existsAsync(
        id: OrderId,
        cancellationToken?: AbortSignal
    ): Promise<Result<boolean>> {
        try {
            this.checkCancellation(cancellationToken);

            const exists = this.orders.has(id.value);
            return Result.ok(exists);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.ExistsFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find orders by customer ID
     */
    public async findByCustomerIdAsync(
        customerId: CustomerId,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const orderIds = this.customerIndex.get(customerId.value) || new Set();
            const orders = Array.from(orderIds)
                .map(id => this.orders.get(id))
                .filter((order): order is Order => order !== undefined);

            return Result.ok(orders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindByCustomerFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find orders by status
     */
    public async findByStatusAsync(
        status: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const orderIds = this.statusIndex.get(status.value) || new Set();
            const orders = Array.from(orderIds)
                .map(id => this.orders.get(id))
                .filter((order): order is Order => order !== undefined);

            return Result.ok(orders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindByStatusFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find orders by customer and status
     */
    public async findByCustomerAndStatusAsync(
        customerId: CustomerId,
        status: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const customerOrders = await this.findByCustomerIdAsync(customerId, cancellationToken);
            if (customerOrders.isFailure) {
                return customerOrders;
            }

            const filteredOrders = customerOrders.value
                .filter(order => order.status.equals(status));

            return Result.ok(filteredOrders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindByCustomerAndStatusFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find orders by date range
     */
    public async findByDateRangeAsync(
        startDate: Date,
        endDate: Date,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const orders = Array.from(this.orders.values())
                .filter(order => {
                    const createdAt = order.createdAt;
                    return createdAt >= startDate && createdAt <= endDate;
                });

            return Result.ok(orders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindByDateRangeFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find orders by amount range
     */
    public async findByAmountRangeAsync(
        minAmount: number,
        maxAmount: number,
        currency: string,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const orders = Array.from(this.orders.values())
                .filter(order => {
                    const total = order.totalAmount;
                    return total.currency === currency &&
                           total.amount >= minAmount &&
                           total.amount <= maxAmount;
                });

            return Result.ok(orders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindByAmountRangeFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Get customer statistics
     */
    public async getCustomerStatisticsAsync(
        customerId: CustomerId,
        cancellationToken?: AbortSignal
    ): Promise<Result<OrderStatistics>> {
        try {
            this.checkCancellation(cancellationToken);

            const customerOrdersResult = await this.findByCustomerIdAsync(customerId, cancellationToken);
            if (customerOrdersResult.isFailure) {
                return customerOrdersResult.error;
            }

            const orders = customerOrdersResult.value;

            if (orders.length === 0) {
                return Result.ok({
                    customerId: customerId.value,
                    totalOrders: 0,
                    totalAmount: 0,
                    currency: 'USD',
                    averageOrderValue: 0,
                    ordersByStatus: {},
                    mostOrderedProducts: []
                });
            }

            // Calculate statistics
            const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount.amount, 0);
            const currency = orders[0].totalAmount.currency;
            const averageOrderValue = totalAmount / orders.length;

            // Group by status
            const ordersByStatus: Record<string, number> = {};
            for (const order of orders) {
                const status = order.status.value;
                ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
            }

            // Calculate product statistics
            const productStats = new Map<string, { count: number; quantity: number; amount: number }>();
            for (const order of orders) {
                for (const item of order.items) {
                    const existing = productStats.get(item.productName) || { count: 0, quantity: 0, amount: 0 };
                    productStats.set(item.productName, {
                        count: existing.count + 1,
                        quantity: existing.quantity + item.quantity,
                        amount: existing.amount + item.totalPrice.amount
                    });
                }
            }

            const mostOrderedProducts: ProductStatistic[] = Array.from(productStats.entries())
                .map(([productName, stats]) => ({
                    productName,
                    orderCount: stats.count,
                    totalQuantity: stats.quantity,
                    totalAmount: stats.amount
                }))
                .sort((a, b) => b.orderCount - a.orderCount)
                .slice(0, 10);

            // Get date range
            const sortedOrders = orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            const firstOrderDate = sortedOrders[0].createdAt;
            const lastOrderDate = sortedOrders[sortedOrders.length - 1].createdAt;

            return Result.ok({
                customerId: customerId.value,
                totalOrders: orders.length,
                totalAmount,
                currency,
                averageOrderValue,
                firstOrderDate,
                lastOrderDate,
                ordersByStatus,
                mostOrderedProducts
            });

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.GetStatisticsFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find recent orders
     */
    public async findRecentOrdersAsync(
        limit: number,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const orders = Array.from(this.orders.values())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, limit);

            return Result.ok(orders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindRecentFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find orders containing a specific product
     */
    public async findOrdersWithProductAsync(
        productName: string,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const orders = Array.from(this.orders.values())
                .filter(order => order.hasProduct(productName));

            return Result.ok(orders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindWithProductFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Count orders by status
     */
    public async countByStatusAsync(
        status: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<Result<number>> {
        try {
            this.checkCancellation(cancellationToken);

            const orderIds = this.statusIndex.get(status.value) || new Set();
            return Result.ok(orderIds.size);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.CountByStatusFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Get total sales for date range
     */
    public async getTotalSalesAsync(
        startDate: Date,
        endDate: Date,
        currency: string,
        cancellationToken?: AbortSignal
    ): Promise<Result<number>> {
        try {
            this.checkCancellation(cancellationToken);

            const ordersResult = await this.findByDateRangeAsync(startDate, endDate, cancellationToken);
            if (ordersResult.isFailure) {
                return ordersResult.error;
            }

            const totalSales = ordersResult.value
                .filter(order => order.totalAmount.currency === currency)
                .reduce((sum, order) => sum + order.totalAmount.amount, 0);

            return Result.ok(totalSales);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.GetTotalSalesFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Find stale orders
     */
    public async findStaleOrdersAsync(
        daysOld: number,
        cancellationToken?: AbortSignal
    ): Promise<Result<Order[]>> {
        try {
            this.checkCancellation(cancellationToken);

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const staleOrders = Array.from(this.orders.values())
                .filter(order =>
                    order.status === OrderStatus.PENDING &&
                    order.createdAt < cutoffDate
                );

            return Result.ok(staleOrders);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.FindStaleFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Bulk update status (administrative operation)
     */
    public async bulkUpdateStatusAsync(
        orderIds: OrderId[],
        newStatus: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<Result<number>> {
        try {
            this.checkCancellation(cancellationToken);

            let updatedCount = 0;

            for (const orderId of orderIds) {
                const order = this.orders.get(orderId.value);
                if (order && order.status.canTransitionTo(newStatus)) {
                    // Remove from old status index
                    this.removeFromIndexes(order);

                    // This is a direct status update for administrative purposes
                    // In a real implementation, this would need proper business logic
                    (order as any)._status = newStatus;

                    // Update indexes
                    this.updateIndexes(order);

                    updatedCount++;
                }
            }

            return Result.ok(updatedCount);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.BulkUpdateFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Save multiple orders in a transaction
     */
    public async saveAllAsync(
        orders: Order[],
        cancellationToken?: AbortSignal
    ): Promise<Result<void>> {
        try {
            this.checkCancellation(cancellationToken);

            // In a real implementation, this would be a database transaction
            // For in-memory, we'll simulate by either saving all or none

            const originalState = new Map(this.orders);
            const originalCustomerIndex = new Map(this.customerIndex);
            const originalStatusIndex = new Map(this.statusIndex);

            try {
                for (const order of orders) {
                    if (this.orders.has(order.id.value)) {
                        const updateResult = await this.updateAsync(order, cancellationToken);
                        if (updateResult.isFailure) {
                            throw new Error(updateResult.error.message);
                        }
                    } else {
                        const addResult = await this.addAsync(order, cancellationToken);
                        if (addResult.isFailure) {
                            throw new Error(addResult.error.message);
                        }
                    }
                }

                return Result.ok();

            } catch (error) {
                // Rollback on error
                this.orders.clear();
                this.customerIndex.clear();
                this.statusIndex.clear();

                for (const [key, value] of originalState) {
                    this.orders.set(key, value);
                }
                for (const [key, value] of originalCustomerIndex) {
                    this.customerIndex.set(key, value);
                }
                for (const [key, value] of originalStatusIndex) {
                    this.statusIndex.set(key, value);
                }

                return Result.fail(Error.infrastructure(
                    'Repository.SaveAllFailed',
                    error instanceof Error ? error.message : 'Unknown error'
                ));
            }

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return Result.fail(Error.infrastructure(
                    'Repository.OperationCancelled',
                    'Operation was cancelled'
                ));
            }
            return Result.fail(Error.infrastructure(
                'Repository.SaveAllFailed',
                error instanceof Error ? error.message : 'Unknown error'
            ));
        }
    }

    /**
     * Clear all orders (for testing)
     */
    public clear(): void {
        this.orders.clear();
        this.customerIndex.clear();
        this.statusIndex.clear();
    }

    /**
     * Get all orders (for testing)
     */
    public getAllOrders(): Order[] {
        return Array.from(this.orders.values());
    }

    private checkCancellation(signal?: AbortSignal): void {
        if (signal?.aborted) {
            throw new Error('Operation was cancelled');
        }
    }

    private cloneOrder(order: Order): Order {
        // In a real implementation, this would use proper serialization
        // For this example, we'll create a new order with the same data
        return Order.fromData(
            order.id,
            order.customerId,
            order.status,
            Array.from(order.items),
            order.createdAt,
            order.updatedAt,
            order.version
        );
    }

    private updateIndexes(order: Order): void {
        // Update customer index
        const customerOrders = this.customerIndex.get(order.customerId.value) || new Set();
        customerOrders.add(order.id.value);
        this.customerIndex.set(order.customerId.value, customerOrders);

        // Update status index
        const statusOrders = this.statusIndex.get(order.status.value) || new Set();
        statusOrders.add(order.id.value);
        this.statusIndex.set(order.status.value, statusOrders);
    }

    private removeFromIndexes(order: Order): void {
        // Remove from customer index
        const customerOrders = this.customerIndex.get(order.customerId.value);
        if (customerOrders) {
            customerOrders.delete(order.id.value);
            if (customerOrders.size === 0) {
                this.customerIndex.delete(order.customerId.value);
            }
        }

        // Remove from status index
        const statusOrders = this.statusIndex.get(order.status.value);
        if (statusOrders) {
            statusOrders.delete(order.id.value);
            if (statusOrders.size === 0) {
                this.statusIndex.delete(order.status.value);
            }
        }
    }
}