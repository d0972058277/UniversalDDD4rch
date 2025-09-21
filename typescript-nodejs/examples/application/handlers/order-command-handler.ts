import { Result, Error } from '../../../src/functional';
import { Order, OrderId, CustomerId } from '../../domain/entities/order';
import { OrderItem, OrderItemId } from '../../domain/entities/order-item';
import { Money } from '../../domain/value-objects/money';
import { OrderService } from '../../domain/services/order-service';
import { IOrderRepository } from '../interfaces/order-repository';
import {
    CreateOrderCommand,
    UpdateOrderCommand,
    ConfirmOrderCommand,
    ShipOrderCommand,
    DeliverOrderCommand,
    CancelOrderCommand,
    AddOrderItemCommand,
    RemoveOrderItemCommand,
    UpdateOrderItemQuantityCommand,
    CommandResult,
    ValidationError,
    CommandValidation
} from '../commands/create-order-command';

/**
 * Order command handler implementing application services
 * Demonstrates CQRS command handling with domain services and repository coordination
 */
export class OrderCommandHandler {
    constructor(
        private readonly orderRepository: IOrderRepository,
        private readonly orderService: OrderService
    ) {}

    /**
     * Handle CreateOrderCommand
     */
    public async handleCreateOrderAsync(
        command: CreateOrderCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<string>> {
        try {
            // Validate command
            const validationErrors = CommandValidation.validateCreateOrderCommand(command);
            if (validationErrors.length > 0) {
                return {
                    success: false,
                    validationErrors
                };
            }

            // Create the order
            const customerId = new CustomerId(command.customerId);
            const order = Order.create(customerId, command.correlationId);

            // Add items to the order
            for (const itemCommand of command.items) {
                const money = new Money(itemCommand.unitPrice, itemCommand.currency);
                const orderItem = OrderItem.create(
                    itemCommand.productName,
                    money,
                    itemCommand.quantity
                );

                const addResult = order.addItem(orderItem);
                if (addResult.isFailure) {
                    return {
                        success: false,
                        error: addResult.error.message
                    };
                }
            }

            // Validate business rules
            const validation = this.orderService.validateOrder(order);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join('; '),
                    validationErrors: validation.errors.map(error => ({
                        field: 'order',
                        message: error,
                        code: 'BUSINESS_RULE_VIOLATION'
                    }))
                };
            }

            // Save the order
            const saveResult = await this.orderRepository.addAsync(order, cancellationToken);
            if (saveResult.isFailure) {
                return {
                    success: false,
                    error: saveResult.error.message
                };
            }

            return {
                success: true,
                data: order.id.value
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle ConfirmOrderCommand
     */
    public async handleConfirmOrderAsync(
        command: ConfirmOrderCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<void>> {
        try {
            // Validate command
            const orderIdErrors = CommandValidation.validateOrderId(command.orderId);
            const versionErrors = CommandValidation.validateVersion(command.expectedVersion);
            const validationErrors = [...orderIdErrors, ...versionErrors];

            if (validationErrors.length > 0) {
                return {
                    success: false,
                    validationErrors
                };
            }

            // Get the order
            const orderId = OrderId.fromString(command.orderId);
            const orderResult = await this.orderRepository.getByIdAsync(orderId, cancellationToken);

            if (orderResult.isFailure) {
                return {
                    success: false,
                    error: orderResult.error.message
                };
            }

            if (!orderResult.value.hasValue) {
                return {
                    success: false,
                    error: `Order ${command.orderId} not found`
                };
            }

            const order = orderResult.value;

            // Check optimistic concurrency
            if (order.version !== command.expectedVersion) {
                return {
                    success: false,
                    error: `Concurrency conflict: expected version ${command.expectedVersion}, actual version ${order.version}`
                };
            }

            // Confirm the order
            const confirmResult = order.confirm();
            if (confirmResult.isFailure) {
                return {
                    success: false,
                    error: confirmResult.error.message
                };
            }

            // Save the updated order
            const updateResult = await this.orderRepository.updateAsync(order, cancellationToken);
            if (updateResult.isFailure) {
                return {
                    success: false,
                    error: updateResult.error.message
                };
            }

            return {
                success: true
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle ShipOrderCommand
     */
    public async handleShipOrderAsync(
        command: ShipOrderCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<void>> {
        try {
            // Get and validate order
            const orderResult = await this.getAndValidateOrder(
                command.orderId,
                command.expectedVersion,
                cancellationToken
            );

            if (!orderResult.success || !orderResult.data) {
                return orderResult;
            }

            const order = orderResult.data;

            // Ship the order
            const shipResult = order.ship();
            if (shipResult.isFailure) {
                return {
                    success: false,
                    error: shipResult.error.message
                };
            }

            // Save the updated order
            const updateResult = await this.orderRepository.updateAsync(order, cancellationToken);
            if (updateResult.isFailure) {
                return {
                    success: false,
                    error: updateResult.error.message
                };
            }

            return {
                success: true
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle DeliverOrderCommand
     */
    public async handleDeliverOrderAsync(
        command: DeliverOrderCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<void>> {
        try {
            // Get and validate order
            const orderResult = await this.getAndValidateOrder(
                command.orderId,
                command.expectedVersion,
                cancellationToken
            );

            if (!orderResult.success || !orderResult.data) {
                return orderResult;
            }

            const order = orderResult.data;

            // Deliver the order
            const deliverResult = order.deliver();
            if (deliverResult.isFailure) {
                return {
                    success: false,
                    error: deliverResult.error.message
                };
            }

            // Save the updated order
            const updateResult = await this.orderRepository.updateAsync(order, cancellationToken);
            if (updateResult.isFailure) {
                return {
                    success: false,
                    error: updateResult.error.message
                };
            }

            return {
                success: true
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle CancelOrderCommand
     */
    public async handleCancelOrderAsync(
        command: CancelOrderCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<void>> {
        try {
            // Validate command
            if (!command.reason || command.reason.trim().length === 0) {
                return {
                    success: false,
                    validationErrors: [{
                        field: 'reason',
                        message: 'Cancellation reason is required',
                        code: 'REASON_REQUIRED'
                    }]
                };
            }

            // Get and validate order
            const orderResult = await this.getAndValidateOrder(
                command.orderId,
                command.expectedVersion,
                cancellationToken
            );

            if (!orderResult.success || !orderResult.data) {
                return orderResult;
            }

            const order = orderResult.data;

            // Cancel the order
            const cancelResult = order.cancel();
            if (cancelResult.isFailure) {
                return {
                    success: false,
                    error: cancelResult.error.message
                };
            }

            // Save the updated order
            const updateResult = await this.orderRepository.updateAsync(order, cancellationToken);
            if (updateResult.isFailure) {
                return {
                    success: false,
                    error: updateResult.error.message
                };
            }

            return {
                success: true
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle AddOrderItemCommand
     */
    public async handleAddOrderItemAsync(
        command: AddOrderItemCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<string>> {
        try {
            // Validate item details
            const itemErrors = CommandValidation.validateCreateOrderItemCommand({
                productName: command.productName,
                unitPrice: command.unitPrice,
                currency: command.currency,
                quantity: command.quantity
            });

            if (itemErrors.length > 0) {
                return {
                    success: false,
                    validationErrors: itemErrors
                };
            }

            // Get and validate order
            const orderResult = await this.getAndValidateOrder(
                command.orderId,
                command.expectedVersion,
                cancellationToken
            );

            if (!orderResult.success || !orderResult.data) {
                return orderResult;
            }

            const order = orderResult.data;

            // Create and add the item
            const money = new Money(command.unitPrice, command.currency);
            const orderItem = OrderItem.create(command.productName, money, command.quantity);

            const addResult = order.addItem(orderItem);
            if (addResult.isFailure) {
                return {
                    success: false,
                    error: addResult.error.message
                };
            }

            // Validate updated order
            const validation = this.orderService.validateOrder(order);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join('; ')
                };
            }

            // Save the updated order
            const updateResult = await this.orderRepository.updateAsync(order, cancellationToken);
            if (updateResult.isFailure) {
                return {
                    success: false,
                    error: updateResult.error.message
                };
            }

            return {
                success: true,
                data: orderItem.id.value
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle RemoveOrderItemCommand
     */
    public async handleRemoveOrderItemAsync(
        command: RemoveOrderItemCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<void>> {
        try {
            // Get and validate order
            const orderResult = await this.getAndValidateOrder(
                command.orderId,
                command.expectedVersion,
                cancellationToken
            );

            if (!orderResult.success || !orderResult.data) {
                return orderResult;
            }

            const order = orderResult.data;

            // Remove the item
            const itemId = OrderItemId.fromString(command.itemId);
            const removeResult = order.removeItem(itemId);
            if (removeResult.isFailure) {
                return {
                    success: false,
                    error: removeResult.error.message
                };
            }

            // Save the updated order
            const updateResult = await this.orderRepository.updateAsync(order, cancellationToken);
            if (updateResult.isFailure) {
                return {
                    success: false,
                    error: updateResult.error.message
                };
            }

            return {
                success: true
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle UpdateOrderItemQuantityCommand
     */
    public async handleUpdateOrderItemQuantityAsync(
        command: UpdateOrderItemQuantityCommand,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<void>> {
        try {
            // Validate quantity
            if (!Number.isInteger(command.newQuantity) || command.newQuantity <= 0) {
                return {
                    success: false,
                    validationErrors: [{
                        field: 'newQuantity',
                        message: 'Quantity must be a positive integer',
                        code: 'INVALID_QUANTITY'
                    }]
                };
            }

            // Get and validate order
            const orderResult = await this.getAndValidateOrder(
                command.orderId,
                command.expectedVersion,
                cancellationToken
            );

            if (!orderResult.success || !orderResult.data) {
                return {
                    success: false,
                    error: orderResult.error,
                    validationErrors: orderResult.validationErrors
                };
            }

            const order = orderResult.data;

            // Update the item quantity
            const itemId = OrderItemId.fromString(command.itemId);
            const updateResult = order.updateItemQuantity(itemId, command.newQuantity);
            if (updateResult.isFailure) {
                return {
                    success: false,
                    error: updateResult.error.message
                };
            }

            // Save the updated order
            const saveResult = await this.orderRepository.updateAsync(order, cancellationToken);
            if (saveResult.isFailure) {
                return {
                    success: false,
                    error: saveResult.error.message
                };
            }

            return {
                success: true
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Helper method to get and validate an order
     */
    private async getAndValidateOrder(
        orderId: string,
        expectedVersion: number,
        cancellationToken?: AbortSignal
    ): Promise<CommandResult<Order>> {
        // Validate inputs
        const orderIdErrors = CommandValidation.validateOrderId(orderId);
        const versionErrors = CommandValidation.validateVersion(expectedVersion);
        const validationErrors = [...orderIdErrors, ...versionErrors];

        if (validationErrors.length > 0) {
            return {
                success: false,
                validationErrors
            };
        }

        // Get the order
        const orderIdValue = OrderId.fromString(orderId);
        const orderResult = await this.orderRepository.getByIdAsync(orderIdValue, cancellationToken);

        if (!orderResult.hasValue) {
            return {
                success: false,
                error: `Order ${orderId} not found`
            };
        }

        const order = orderResult.value;

        // Check optimistic concurrency
        if (order.version !== expectedVersion) {
            return {
                success: false,
                error: `Concurrency conflict: expected version ${expectedVersion}, actual version ${order.version}`
            };
        }

        return {
            success: true,
            data: order
        };
    }
}