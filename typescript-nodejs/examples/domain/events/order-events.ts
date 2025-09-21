import { DomainEventBase } from '../../../src/domain/domain-event-base';

/**
 * Event fired when a new order is created
 */
export class OrderCreatedEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly customerId: string;
    public readonly totalAmount: number;

    constructor(
        orderId: string,
        customerId: string,
        totalAmount: number,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.customerId = customerId;
        this.totalAmount = totalAmount;
    }
}

/**
 * Event fired when order status changes
 */
export class OrderStatusChangedEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly previousStatus: string;
    public readonly newStatus: string;

    constructor(
        orderId: string,
        previousStatus: string,
        newStatus: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
    }
}

/**
 * Event fired when an item is added to an order
 */
export class OrderItemAddedEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly itemId: string;
    public readonly productName: string;
    public readonly quantity: number;
    public readonly unitPrice: number;
    public readonly currency: string;

    constructor(
        orderId: string,
        itemId: string,
        productName: string,
        quantity: number,
        unitPrice: number,
        currency: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.itemId = itemId;
        this.productName = productName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.currency = currency;
    }
}

/**
 * Event fired when an item is removed from an order
 */
export class OrderItemRemovedEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly itemId: string;
    public readonly productName: string;

    constructor(
        orderId: string,
        itemId: string,
        productName: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.itemId = itemId;
        this.productName = productName;
    }
}

/**
 * Event fired when an order item is updated
 */
export class OrderItemUpdatedEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly itemId: string;
    public readonly productName: string;
    public readonly previousQuantity: number;
    public readonly newQuantity: number;

    constructor(
        orderId: string,
        itemId: string,
        productName: string,
        previousQuantity: number,
        newQuantity: number,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.itemId = itemId;
        this.productName = productName;
        this.previousQuantity = previousQuantity;
        this.newQuantity = newQuantity;
    }
}

/**
 * Event fired when an order is confirmed
 */
export class OrderConfirmedEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly customerId: string;
    public readonly totalAmount: number;
    public readonly currency: string;
    public readonly itemCount: number;

    constructor(
        orderId: string,
        customerId: string,
        totalAmount: number,
        currency: string,
        itemCount: number,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.customerId = customerId;
        this.totalAmount = totalAmount;
        this.currency = currency;
        this.itemCount = itemCount;
    }
}

/**
 * Event fired when an order is shipped
 */
export class OrderShippedEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly customerId: string;
    public readonly shippingAddress?: string;
    public readonly trackingNumber?: string;

    constructor(
        orderId: string,
        customerId: string,
        shippingAddress?: string,
        trackingNumber?: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.customerId = customerId;
        this.shippingAddress = shippingAddress;
        this.trackingNumber = trackingNumber;
    }
}

/**
 * Event fired when an order is delivered
 */
export class OrderDeliveredEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly customerId: string;
    public readonly deliveredAt: Date;
    public readonly deliveredBy?: string;

    constructor(
        orderId: string,
        customerId: string,
        deliveredAt: Date,
        deliveredBy?: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.customerId = customerId;
        this.deliveredAt = deliveredAt;
        this.deliveredBy = deliveredBy;
    }
}

/**
 * Event fired when an order is cancelled
 */
export class OrderCancelledEvent extends DomainEventBase {
    public readonly orderId: string;
    public readonly customerId: string;
    public readonly reason?: string;
    public readonly refundAmount?: number;
    public readonly refundCurrency?: string;

    constructor(
        orderId: string,
        customerId: string,
        reason?: string,
        refundAmount?: number,
        refundCurrency?: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
        this.orderId = orderId;
        this.customerId = customerId;
        this.reason = reason;
        this.refundAmount = refundAmount;
        this.refundCurrency = refundCurrency;
    }
}

/**
 * Export all order events for convenient importing
 */
export const OrderEvents = {
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    OrderItemAddedEvent,
    OrderItemRemovedEvent,
    OrderItemUpdatedEvent,
    OrderConfirmedEvent,
    OrderShippedEvent,
    OrderDeliveredEvent,
    OrderCancelledEvent
} as const;

/**
 * Union type of all order event types
 */
export type OrderEvent =
    | OrderCreatedEvent
    | OrderStatusChangedEvent
    | OrderItemAddedEvent
    | OrderItemRemovedEvent
    | OrderItemUpdatedEvent
    | OrderConfirmedEvent
    | OrderShippedEvent
    | OrderDeliveredEvent
    | OrderCancelledEvent;