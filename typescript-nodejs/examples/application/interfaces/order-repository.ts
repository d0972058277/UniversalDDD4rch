import { IRepository } from '../../../src/domain/interfaces/i-repository';
import { Result, ResultOf, Maybe } from '../../../src/functional';
import { Order, OrderId, CustomerId } from '../../domain/entities/order';
import { OrderStatus } from '../../domain/value-objects/order-status';

/**
 * Order-specific repository interface extending the base repository
 * Demonstrates domain-specific repository methods while maintaining DDD patterns
 */
export interface IOrderRepository extends IRepository<Order, OrderId> {
    /**
     * Find orders by customer ID
     */
    findByCustomerIdAsync(
        customerId: CustomerId,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Find orders by status
     */
    findByStatusAsync(
        status: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Find orders by customer and status
     */
    findByCustomerAndStatusAsync(
        customerId: CustomerId,
        status: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Find orders created within a date range
     */
    findByDateRangeAsync(
        startDate: Date,
        endDate: Date,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Find orders by total amount range
     */
    findByAmountRangeAsync(
        minAmount: number,
        maxAmount: number,
        currency: string,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Get order statistics for a customer
     */
    getCustomerStatisticsAsync(
        customerId: CustomerId,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<OrderStatistics>>;

    /**
     * Find recent orders (last N orders)
     */
    findRecentOrdersAsync(
        limit: number,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Find orders with specific product
     */
    findOrdersWithProductAsync(
        productName: string,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Count orders by status
     */
    countByStatusAsync(
        status: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<number>>;

    /**
     * Get total sales amount for a date range
     */
    getTotalSalesAsync(
        startDate: Date,
        endDate: Date,
        currency: string,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<number>>;

    /**
     * Find pending orders older than specified days
     */
    findStaleOrdersAsync(
        daysOld: number,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<Order[]>>;

    /**
     * Bulk update order status (for administrative operations)
     */
    bulkUpdateStatusAsync(
        orderIds: OrderId[],
        newStatus: OrderStatus,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<number>>;

    /**
     * Save multiple orders in a transaction
     */
    saveAllAsync(
        orders: Order[],
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<void>>;
}

/**
 * Order statistics for analytics
 */
export interface OrderStatistics {
    customerId: string;
    totalOrders: number;
    totalAmount: number;
    currency: string;
    averageOrderValue: number;
    lastOrderDate: Date | undefined;
    firstOrderDate: Date | undefined;
    ordersByStatus: Record<string, number>;
    mostOrderedProducts: ProductStatistic[];
}

/**
 * Product ordering statistics
 */
export interface ProductStatistic {
    productName: string;
    orderCount: number;
    totalQuantity: number;
    totalAmount: number;
}

/**
 * Query parameters for order search
 */
export interface OrderSearchCriteria {
    customerId?: CustomerId;
    status?: OrderStatus;
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
    startDate?: Date;
    endDate?: Date;
    productName?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'totalAmount' | 'status' | 'customerId';
    sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated search result
 */
export interface OrderSearchResult {
    orders: Order[];
    totalCount: number;
    hasMore: boolean;
    nextOffset?: number;
}

/**
 * Extended repository interface with advanced search capabilities
 */
export interface IAdvancedOrderRepository extends IOrderRepository {
    /**
     * Advanced search with multiple criteria and pagination
     */
    searchAsync(
        criteria: OrderSearchCriteria,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<OrderSearchResult>>;

    /**
     * Get order aggregations for reporting
     */
    getOrderAggregationsAsync(
        groupBy: 'status' | 'customer' | 'date' | 'product',
        startDate?: Date,
        endDate?: Date,
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<OrderAggregation[]>>;

    /**
     * Get performance metrics
     */
    getPerformanceMetricsAsync(
        period: 'day' | 'week' | 'month' | 'year',
        cancellationToken?: AbortSignal
    ): Promise<ResultOf<PerformanceMetrics>>;
}

/**
 * Order aggregation for reporting
 */
export interface OrderAggregation {
    key: string;
    count: number;
    totalAmount: number;
    averageAmount: number;
    currency: string;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
    period: string;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    currency: string;
    conversionRate: number;
    topProducts: ProductStatistic[];
    statusDistribution: Record<string, number>;
    dailyTrends: DailyTrend[];
}

/**
 * Daily trend data point
 */
export interface DailyTrend {
    date: string;
    orderCount: number;
    revenue: number;
    averageOrderValue: number;
}