import { Request, Response, NextFunction } from 'express';
import { Result, Error as DomainError } from '../../../src/functional';
import { OrderCommandHandler } from '../../application/handlers/order-command-handler';
import { IOrderRepository } from '../../application/interfaces/order-repository';
import { OrderId, CustomerId } from '../../domain/entities/order';
import { OrderStatus } from '../../domain/value-objects/order-status';
import {
    CreateOrderCommand,
    ConfirmOrderCommand,
    CancelOrderCommand,
    AddOrderItemCommand,
    RemoveOrderItemCommand,
    UpdateOrderItemQuantityCommand,
    CommandValidation
} from '../../application/commands/create-order-command';
import { resultHandler, validateBody, validateQuery } from '../middleware/result-middleware';

/**
 * Order controller demonstrating CQRS and functional error handling in Express.js
 * Uses Result<T> pattern throughout for consistent error handling
 */
export class OrderController {
    constructor(
        private readonly commandHandler: OrderCommandHandler,
        private readonly orderRepository: IOrderRepository
    ) {}

    /**
     * Create a new order
     * POST /api/orders
     */
    public createOrder = resultHandler(async (req: Request): Promise<Result<{ orderId: string }>> => {
        const command: CreateOrderCommand = req.body;

        const result = await this.commandHandler.handleCreateOrderAsync(command);

        if (!result.success) {
            return Result.fail(DomainError.validation(
                'OrderController.CreateOrderFailed',
                result.error || 'Failed to create order'
            ));
        }

        return Result.ok({ orderId: result.data! });
    });

    /**
     * Get order by ID
     * GET /api/orders/:id
     */
    public getOrder = resultHandler(async (req: Request): Promise<Result<any>> => {
        const orderId = req.params.id;

        if (!orderId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingOrderId',
                'Order ID is required'
            ));
        }

        const orderIdValue = OrderId.fromString(orderId);
        const orderResult = await this.orderRepository.getByIdAsync(orderIdValue);

        if (orderResult.isFailure) {
            return orderResult.error;
        }

        if (!orderResult.value.hasValue) {
            return Result.fail(DomainError.domain(
                'OrderController.OrderNotFound',
                `Order with ID ${orderId} not found`
            ));
        }

        const order = orderResult.value.value;

        return Result.ok({
            id: order.id.value,
            customerId: order.customerId.value,
            status: order.status.value,
            totalAmount: {
                amount: order.totalAmount.amount,
                currency: order.totalAmount.currency
            },
            itemCount: order.itemCount,
            totalQuantity: order.totalQuantity,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            version: order.version,
            items: order.items.map(item => ({
                id: item.id.value,
                productName: item.productName,
                unitPrice: {
                    amount: item.unitPrice.amount,
                    currency: item.unitPrice.currency
                },
                quantity: item.quantity,
                totalPrice: {
                    amount: item.totalPrice.amount,
                    currency: item.totalPrice.currency
                }
            }))
        });
    });

    /**
     * Get orders by customer ID
     * GET /api/customers/:customerId/orders
     */
    public getOrdersByCustomer = resultHandler(async (req: Request): Promise<Result<any[]>> => {
        const customerId = req.params.customerId;

        if (!customerId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingCustomerId',
                'Customer ID is required'
            ));
        }

        const customerIdValue = new CustomerId(customerId);
        const ordersResult = await this.orderRepository.findByCustomerIdAsync(customerIdValue);

        if (ordersResult.isFailure) {
            return ordersResult.error;
        }

        return Result.ok(ordersResult.value.map(order => ({
            id: order.id.value,
            status: order.status.value,
            totalAmount: {
                amount: order.totalAmount.amount,
                currency: order.totalAmount.currency
            },
            itemCount: order.itemCount,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        })));
    });

    /**
     * Get orders by status
     * GET /api/orders?status=pending
     */
    public getOrdersByStatus = resultHandler(async (req: Request): Promise<Result<any[]>> => {
        const statusParam = req.query.status as string;

        if (!statusParam) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingStatus',
                'Status query parameter is required'
            ));
        }

        let status: OrderStatus;
        try {
            status = OrderStatus.fromString(statusParam);
        } catch (error) {
            return Result.fail(DomainError.validation(
                'OrderController.InvalidStatus',
                `Invalid status: ${statusParam}`
            ));
        }

        const ordersResult = await this.orderRepository.findByStatusAsync(status);

        if (ordersResult.isFailure) {
            return ordersResult.error;
        }

        return Result.ok(ordersResult.value.map(order => ({
            id: order.id.value,
            customerId: order.customerId.value,
            totalAmount: {
                amount: order.totalAmount.amount,
                currency: order.totalAmount.currency
            },
            itemCount: order.itemCount,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        })));
    });

    /**
     * Confirm an order
     * POST /api/orders/:id/confirm
     */
    public confirmOrder = resultHandler(async (req: Request): Promise<Result<void>> => {
        const orderId = req.params.id;
        const { expectedVersion } = req.body;

        if (!orderId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingOrderId',
                'Order ID is required'
            ));
        }

        if (typeof expectedVersion !== 'number') {
            return Result.fail(DomainError.validation(
                'OrderController.MissingVersion',
                'Expected version is required'
            ));
        }

        const command: ConfirmOrderCommand = {
            orderId,
            expectedVersion,
            correlationId: req.headers['x-correlation-id'] as string
        };

        const result = await this.commandHandler.handleConfirmOrderAsync(command);

        if (!result.success) {
            return Result.fail(DomainError.domain(
                'OrderController.ConfirmOrderFailed',
                result.error || 'Failed to confirm order'
            ));
        }

        return Result.ok();
    });

    /**
     * Cancel an order
     * POST /api/orders/:id/cancel
     */
    public cancelOrder = resultHandler(async (req: Request): Promise<Result<void>> => {
        const orderId = req.params.id;
        const { expectedVersion, reason } = req.body;

        if (!orderId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingOrderId',
                'Order ID is required'
            ));
        }

        if (typeof expectedVersion !== 'number') {
            return Result.fail(DomainError.validation(
                'OrderController.MissingVersion',
                'Expected version is required'
            ));
        }

        if (!reason || typeof reason !== 'string') {
            return Result.fail(DomainError.validation(
                'OrderController.MissingReason',
                'Cancellation reason is required'
            ));
        }

        const command: CancelOrderCommand = {
            orderId,
            expectedVersion,
            reason,
            correlationId: req.headers['x-correlation-id'] as string
        };

        const result = await this.commandHandler.handleCancelOrderAsync(command);

        if (!result.success) {
            return Result.fail(DomainError.domain(
                'OrderController.CancelOrderFailed',
                result.error || 'Failed to cancel order'
            ));
        }

        return Result.ok();
    });

    /**
     * Add item to order
     * POST /api/orders/:id/items
     */
    public addOrderItem = resultHandler(async (req: Request): Promise<Result<{ itemId: string }>> => {
        const orderId = req.params.id;
        const { expectedVersion, productName, unitPrice, currency, quantity } = req.body;

        if (!orderId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingOrderId',
                'Order ID is required'
            ));
        }

        const command: AddOrderItemCommand = {
            orderId,
            expectedVersion,
            productName,
            unitPrice,
            currency,
            quantity,
            correlationId: req.headers['x-correlation-id'] as string
        };

        const result = await this.commandHandler.handleAddOrderItemAsync(command);

        if (!result.success) {
            return Result.fail(DomainError.domain(
                'OrderController.AddItemFailed',
                result.error || 'Failed to add item to order'
            ));
        }

        return Result.ok({ itemId: result.data! });
    });

    /**
     * Remove item from order
     * DELETE /api/orders/:id/items/:itemId
     */
    public removeOrderItem = resultHandler(async (req: Request): Promise<Result<void>> => {
        const orderId = req.params.id;
        const itemId = req.params.itemId;
        const { expectedVersion } = req.body;

        if (!orderId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingOrderId',
                'Order ID is required'
            ));
        }

        if (!itemId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingItemId',
                'Item ID is required'
            ));
        }

        if (typeof expectedVersion !== 'number') {
            return Result.fail(DomainError.validation(
                'OrderController.MissingVersion',
                'Expected version is required'
            ));
        }

        const command: RemoveOrderItemCommand = {
            orderId,
            itemId,
            expectedVersion,
            correlationId: req.headers['x-correlation-id'] as string
        };

        const result = await this.commandHandler.handleRemoveOrderItemAsync(command);

        if (!result.success) {
            return Result.fail(DomainError.domain(
                'OrderController.RemoveItemFailed',
                result.error || 'Failed to remove item from order'
            ));
        }

        return Result.ok();
    });

    /**
     * Update item quantity
     * PATCH /api/orders/:id/items/:itemId/quantity
     */
    public updateItemQuantity = resultHandler(async (req: Request): Promise<Result<void>> => {
        const orderId = req.params.id;
        const itemId = req.params.itemId;
        const { expectedVersion, newQuantity } = req.body;

        if (!orderId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingOrderId',
                'Order ID is required'
            ));
        }

        if (!itemId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingItemId',
                'Item ID is required'
            ));
        }

        if (typeof expectedVersion !== 'number') {
            return Result.fail(DomainError.validation(
                'OrderController.MissingVersion',
                'Expected version is required'
            ));
        }

        if (typeof newQuantity !== 'number' || newQuantity <= 0) {
            return Result.fail(DomainError.validation(
                'OrderController.InvalidQuantity',
                'New quantity must be a positive number'
            ));
        }

        const command: UpdateOrderItemQuantityCommand = {
            orderId,
            itemId,
            newQuantity,
            expectedVersion,
            correlationId: req.headers['x-correlation-id'] as string
        };

        const result = await this.commandHandler.handleUpdateOrderItemQuantityAsync(command);

        if (!result.success) {
            return Result.fail(DomainError.domain(
                'OrderController.UpdateQuantityFailed',
                result.error || 'Failed to update item quantity'
            ));
        }

        return Result.ok();
    });

    /**
     * Get order statistics for a customer
     * GET /api/customers/:customerId/statistics
     */
    public getCustomerStatistics = resultHandler(async (req: Request): Promise<Result<any>> => {
        const customerId = req.params.customerId;

        if (!customerId) {
            return Result.fail(DomainError.validation(
                'OrderController.MissingCustomerId',
                'Customer ID is required'
            ));
        }

        const customerIdValue = new CustomerId(customerId);
        const statisticsResult = await this.orderRepository.getCustomerStatisticsAsync(customerIdValue);

        if (statisticsResult.isFailure) {
            return statisticsResult.error;
        }

        return Result.ok(statisticsResult.value);
    });

    /**
     * Get recent orders
     * GET /api/orders/recent?limit=10
     */
    public getRecentOrders = resultHandler(async (req: Request): Promise<Result<any[]>> => {
        const limitParam = req.query.limit as string;
        const limit = limitParam ? parseInt(limitParam, 10) : 10;

        if (isNaN(limit) || limit <= 0 || limit > 100) {
            return Result.fail(DomainError.validation(
                'OrderController.InvalidLimit',
                'Limit must be a number between 1 and 100'
            ));
        }

        const ordersResult = await this.orderRepository.findRecentOrdersAsync(limit);

        if (ordersResult.isFailure) {
            return ordersResult.error;
        }

        return Result.ok(ordersResult.value.map(order => ({
            id: order.id.value,
            customerId: order.customerId.value,
            status: order.status.value,
            totalAmount: {
                amount: order.totalAmount.amount,
                currency: order.totalAmount.currency
            },
            itemCount: order.itemCount,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        })));
    });

    /**
     * Search orders with filters
     * GET /api/orders/search?customerId=123&status=pending&minAmount=100&maxAmount=1000
     */
    public searchOrders = resultHandler(async (req: Request): Promise<Result<any[]>> => {
        const {
            customerId,
            status,
            minAmount,
            maxAmount,
            currency,
            startDate,
            endDate,
            limit = '50',
            offset = '0'
        } = req.query as Record<string, string>;

        // Parse and validate parameters
        const parsedLimit = parseInt(limit, 10);
        const parsedOffset = parseInt(offset, 10);

        if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
            return Result.fail(DomainError.validation(
                'OrderController.InvalidLimit',
                'Limit must be a number between 1 and 100'
            ));
        }

        if (isNaN(parsedOffset) || parsedOffset < 0) {
            return Result.fail(DomainError.validation(
                'OrderController.InvalidOffset',
                'Offset must be a non-negative number'
            ));
        }

        // Start with all orders and apply filters
        let filteredOrders: any[] = [];

        // Apply customer filter
        if (customerId) {
            const customerIdValue = new CustomerId(customerId);
            const customerOrdersResult = await this.orderRepository.findByCustomerIdAsync(customerIdValue);

            if (customerOrdersResult.isFailure) {
                return customerOrdersResult.error;
            }

            filteredOrders = customerOrdersResult.value.map(order => ({
                id: order.id.value,
                customerId: order.customerId.value,
                status: order.status.value,
                totalAmount: {
                    amount: order.totalAmount.amount,
                    currency: order.totalAmount.currency
                },
                itemCount: order.itemCount,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            }));
        } else {
            // Get recent orders as base
            const recentOrdersResult = await this.orderRepository.findRecentOrdersAsync(1000);

            if (recentOrdersResult.isFailure) {
                return recentOrdersResult.error;
            }

            filteredOrders = recentOrdersResult.value.map(order => ({
                id: order.id.value,
                customerId: order.customerId.value,
                status: order.status.value,
                totalAmount: {
                    amount: order.totalAmount.amount,
                    currency: order.totalAmount.currency
                },
                itemCount: order.itemCount,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            }));
        }

        // Apply status filter
        if (status) {
            try {
                const statusValue = OrderStatus.fromString(status);
                filteredOrders = filteredOrders.filter(order => order.status === statusValue.value);
            } catch (error) {
                return Result.fail(DomainError.validation(
                    'OrderController.InvalidStatus',
                    `Invalid status: ${status}`
                ));
            }
        }

        // Apply amount filters
        if (minAmount) {
            const min = parseFloat(minAmount);
            if (isNaN(min)) {
                return Result.fail(DomainError.validation(
                    'OrderController.InvalidMinAmount',
                    'Minimum amount must be a valid number'
                ));
            }
            filteredOrders = filteredOrders.filter(order => order.totalAmount.amount >= min);
        }

        if (maxAmount) {
            const max = parseFloat(maxAmount);
            if (isNaN(max)) {
                return Result.fail(DomainError.validation(
                    'OrderController.InvalidMaxAmount',
                    'Maximum amount must be a valid number'
                ));
            }
            filteredOrders = filteredOrders.filter(order => order.totalAmount.amount <= max);
        }

        // Apply currency filter
        if (currency) {
            filteredOrders = filteredOrders.filter(order => order.totalAmount.currency === currency);
        }

        // Apply date filters
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                return Result.fail(DomainError.validation(
                    'OrderController.InvalidStartDate',
                    'Start date must be a valid date'
                ));
            }
            filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                return Result.fail(DomainError.validation(
                    'OrderController.InvalidEndDate',
                    'End date must be a valid date'
                ));
            }
            filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) <= end);
        }

        // Apply pagination
        const totalCount = filteredOrders.length;
        const paginatedOrders = filteredOrders.slice(parsedOffset, parsedOffset + parsedLimit);

        return Result.ok({
            orders: paginatedOrders,
            totalCount,
            limit: parsedLimit,
            offset: parsedOffset,
            hasMore: parsedOffset + parsedLimit < totalCount
        });
    });
}

/**
 * Validation schemas for request bodies
 */
export class OrderValidation {
    public static validateCreateOrderBody(body: any): Result<CreateOrderCommand> {
        const errors = CommandValidation.validateCreateOrderCommand(body);

        if (errors.length > 0) {
            return Result.fail(DomainError.validation(
                'OrderValidation.InvalidCreateOrderCommand',
                errors.map(e => e.message).join('; ')
            ));
        }

        return Result.ok(body as CreateOrderCommand);
    }

    public static validateConfirmOrderBody(body: any): Result<{ expectedVersion: number }> {
        if (typeof body.expectedVersion !== 'number') {
            return Result.fail(DomainError.validation(
                'OrderValidation.InvalidExpectedVersion',
                'Expected version must be a number'
            ));
        }

        return Result.ok({ expectedVersion: body.expectedVersion });
    }

    public static validateCancelOrderBody(body: any): Result<{ expectedVersion: number; reason: string }> {
        const errors: string[] = [];

        if (typeof body.expectedVersion !== 'number') {
            errors.push('Expected version must be a number');
        }

        if (!body.reason || typeof body.reason !== 'string') {
            errors.push('Reason is required and must be a string');
        }

        if (errors.length > 0) {
            return Result.fail(DomainError.validation(
                'OrderValidation.InvalidCancelOrderCommand',
                errors.join('; ')
            ));
        }

        return Result.ok({
            expectedVersion: body.expectedVersion,
            reason: body.reason
        });
    }
}