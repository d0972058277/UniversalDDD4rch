/**
 * Command for creating a new order
 * Demonstrates CQRS command pattern with validation and immutability
 */
export interface CreateOrderCommand {
    readonly customerId: string;
    readonly items: CreateOrderItemCommand[];
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for creating an order item within an order
 */
export interface CreateOrderItemCommand {
    readonly productName: string;
    readonly unitPrice: number;
    readonly currency: string;
    readonly quantity: number;
}

/**
 * Command for updating an existing order
 */
export interface UpdateOrderCommand {
    readonly orderId: string;
    readonly items: UpdateOrderItemCommand[];
    readonly expectedVersion: number;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for updating an order item
 */
export interface UpdateOrderItemCommand {
    readonly itemId?: string; // If not provided, create new item
    readonly productName: string;
    readonly unitPrice: number;
    readonly currency: string;
    readonly quantity: number;
    readonly action: 'add' | 'update' | 'remove';
}

/**
 * Command for confirming an order
 */
export interface ConfirmOrderCommand {
    readonly orderId: string;
    readonly expectedVersion: number;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for shipping an order
 */
export interface ShipOrderCommand {
    readonly orderId: string;
    readonly expectedVersion: number;
    readonly shippingAddress?: string;
    readonly trackingNumber?: string;
    readonly carrierName?: string;
    readonly estimatedDeliveryDate?: Date;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for delivering an order
 */
export interface DeliverOrderCommand {
    readonly orderId: string;
    readonly expectedVersion: number;
    readonly deliveredAt: Date;
    readonly deliveredBy?: string;
    readonly customerSignature?: string;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for cancelling an order
 */
export interface CancelOrderCommand {
    readonly orderId: string;
    readonly expectedVersion: number;
    readonly reason: string;
    readonly refundAmount?: number;
    readonly refundMethod?: 'credit_card' | 'bank_transfer' | 'store_credit';
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for adding an item to an existing order
 */
export interface AddOrderItemCommand {
    readonly orderId: string;
    readonly expectedVersion: number;
    readonly productName: string;
    readonly unitPrice: number;
    readonly currency: string;
    readonly quantity: number;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for removing an item from an existing order
 */
export interface RemoveOrderItemCommand {
    readonly orderId: string;
    readonly itemId: string;
    readonly expectedVersion: number;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for updating an order item quantity
 */
export interface UpdateOrderItemQuantityCommand {
    readonly orderId: string;
    readonly itemId: string;
    readonly newQuantity: number;
    readonly expectedVersion: number;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command for applying a discount to an order
 */
export interface ApplyDiscountCommand {
    readonly orderId: string;
    readonly expectedVersion: number;
    readonly discountCode: string;
    readonly discountPercentage?: number;
    readonly discountAmount?: number;
    readonly discountCurrency?: string;
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Batch command for processing multiple orders
 */
export interface BatchProcessOrdersCommand {
    readonly orderIds: string[];
    readonly action: 'confirm' | 'ship' | 'cancel';
    readonly reason?: string; // For cancellation
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Command result types for better type safety
 */
export interface CommandResult<T = void> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: string;
    readonly validationErrors?: ValidationError[];
}

/**
 * Validation error for command validation
 */
export interface ValidationError {
    readonly field: string;
    readonly message: string;
    readonly code: string;
}

/**
 * Command metadata for tracking and auditing
 */
export interface CommandMetadata {
    readonly timestamp: Date;
    readonly userId?: string;
    readonly userRole?: string;
    readonly sourceSystem?: string;
    readonly sessionId?: string;
    readonly ipAddress?: string;
    readonly userAgent?: string;
}

/**
 * Base command interface for common properties
 */
export interface BaseCommand {
    readonly correlationId?: string;
    readonly metadata?: Record<string, unknown>;
    readonly commandId?: string;
    readonly timestamp?: Date;
    readonly userId?: string;
}

/**
 * Command with optimistic concurrency control
 */
export interface VersionedCommand extends BaseCommand {
    readonly expectedVersion: number;
}

/**
 * Command validation rules
 */
export class CommandValidation {
    /**
     * Validate CreateOrderCommand
     */
    public static validateCreateOrderCommand(command: CreateOrderCommand): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!command.customerId || command.customerId.trim().length === 0) {
            errors.push({
                field: 'customerId',
                message: 'Customer ID is required',
                code: 'CUSTOMER_ID_REQUIRED'
            });
        }

        if (!command.items || command.items.length === 0) {
            errors.push({
                field: 'items',
                message: 'Order must contain at least one item',
                code: 'ITEMS_REQUIRED'
            });
        }

        if (command.items) {
            command.items.forEach((item, index) => {
                const itemErrors = this.validateCreateOrderItemCommand(item, `items[${index}]`);
                errors.push(...itemErrors);
            });
        }

        return errors;
    }

    /**
     * Validate CreateOrderItemCommand
     */
    public static validateCreateOrderItemCommand(
        command: CreateOrderItemCommand,
        fieldPrefix = ''
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const prefix = fieldPrefix ? `${fieldPrefix}.` : '';

        if (!command.productName || command.productName.trim().length === 0) {
            errors.push({
                field: `${prefix}productName`,
                message: 'Product name is required',
                code: 'PRODUCT_NAME_REQUIRED'
            });
        }

        if (command.unitPrice <= 0) {
            errors.push({
                field: `${prefix}unitPrice`,
                message: 'Unit price must be positive',
                code: 'INVALID_UNIT_PRICE'
            });
        }

        if (!command.currency || command.currency.length !== 3) {
            errors.push({
                field: `${prefix}currency`,
                message: 'Currency must be a 3-character ISO code',
                code: 'INVALID_CURRENCY'
            });
        }

        if (!Number.isInteger(command.quantity) || command.quantity <= 0) {
            errors.push({
                field: `${prefix}quantity`,
                message: 'Quantity must be a positive integer',
                code: 'INVALID_QUANTITY'
            });
        }

        if (command.quantity > 10000) {
            errors.push({
                field: `${prefix}quantity`,
                message: 'Quantity cannot exceed 10,000',
                code: 'QUANTITY_TOO_HIGH'
            });
        }

        return errors;
    }

    /**
     * Validate order ID
     */
    public static validateOrderId(orderId: string): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!orderId || orderId.trim().length === 0) {
            errors.push({
                field: 'orderId',
                message: 'Order ID is required',
                code: 'ORDER_ID_REQUIRED'
            });
        }

        return errors;
    }

    /**
     * Validate version for optimistic concurrency
     */
    public static validateVersion(version: number): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!Number.isInteger(version) || version < 0) {
            errors.push({
                field: 'expectedVersion',
                message: 'Expected version must be a non-negative integer',
                code: 'INVALID_VERSION'
            });
        }

        return errors;
    }
}

/**
 * Type guards for command identification
 */
export class CommandTypeGuards {
    public static isCreateOrderCommand(obj: any): obj is CreateOrderCommand {
        return obj && typeof obj.customerId === 'string' && Array.isArray(obj.items);
    }

    public static isUpdateOrderCommand(obj: any): obj is UpdateOrderCommand {
        return obj && typeof obj.orderId === 'string' && Array.isArray(obj.items);
    }

    public static isConfirmOrderCommand(obj: any): obj is ConfirmOrderCommand {
        return obj && typeof obj.orderId === 'string' && typeof obj.expectedVersion === 'number';
    }

    public static isCancelOrderCommand(obj: any): obj is CancelOrderCommand {
        return obj && typeof obj.orderId === 'string' && typeof obj.reason === 'string';
    }
}