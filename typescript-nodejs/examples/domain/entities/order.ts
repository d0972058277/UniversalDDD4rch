import { AggregateRoot } from '../../../src/domain/aggregate-root';
import { Result, Error } from '../../../src/functional';
import { Money } from '../value-objects/money';
import { OrderStatus } from '../value-objects/order-status';
import { OrderItem, OrderItemId } from './order-item';
import {
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    OrderItemAddedEvent,
    OrderItemRemovedEvent,
    OrderItemUpdatedEvent
} from '../events/order-events';

/**
 * Order ID value object for strong typing
 */
export class OrderId {
    constructor(public readonly value: string) {
        if (!value || value.trim().length === 0) {
            throw new Error('Order ID cannot be empty');
        }
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: OrderId): boolean {
        return this.value === other.value;
    }

    public static generate(): OrderId {
        return new OrderId(`order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }

    public static fromString(value: string): OrderId {
        return new OrderId(value);
    }
}

/**
 * Customer ID value object
 */
export class CustomerId {
    constructor(public readonly value: string) {
        if (!value || value.trim().length === 0) {
            throw new Error('Customer ID cannot be empty');
        }
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: CustomerId): boolean {
        return this.value === other.value;
    }

    public static fromString(value: string): CustomerId {
        return new CustomerId(value);
    }
}

/**
 * Order aggregate root demonstrating complex business logic and invariants
 * Manages order lifecycle, items, and business rules
 */
export class Order extends AggregateRoot<OrderId> {
    private _customerId: CustomerId;
    private _status: OrderStatus;
    private _items: Map<string, OrderItem>;
    private _createdAt: Date;
    private _updatedAt: Date;
    private _totalAmount: Money | null = null; // Cached value

    constructor(
        id: OrderId,
        customerId: CustomerId,
        correlationId?: string
    ) {
        super(id);

        this._customerId = customerId;
        this._status = OrderStatus.PENDING;
        this._items = new Map();
        this._createdAt = new Date();
        this._updatedAt = new Date();

        this.addEvent(new OrderCreatedEvent(
            id.value,
            customerId.value,
            0, // Initial total amount
            correlationId
        ));
    }

    // Getters
    public get customerId(): CustomerId {
        return this._customerId;
    }

    public get status(): OrderStatus {
        return this._status;
    }

    public get items(): readonly OrderItem[] {
        return Array.from(this._items.values());
    }

    public get createdAt(): Date {
        return new Date(this._createdAt);
    }

    public get updatedAt(): Date {
        return new Date(this._updatedAt);
    }

    public get totalAmount(): Money {
        if (this._totalAmount === null) {
            this.recalculateTotalAmount();
        }
        return this._totalAmount!;
    }

    public get itemCount(): number {
        return this._items.size;
    }

    public get totalQuantity(): number {
        return Array.from(this._items.values()).reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * Add an item to the order
     */
    public addItem(item: OrderItem): Result {
        if (this._status.isFinal()) {
            return Result.fail(Error.domain(
                'Order.CannotModifyFinalOrder',
                `Cannot add items to order in ${this._status} status`
            ));
        }

        // Check if we already have this item (same product)
        const existingItem = this.findItemByProduct(item.productName);
        if (existingItem !== null) {
            return this.updateItemQuantity(
                existingItem.id,
                existingItem.quantity + item.quantity
            );
        }

        // Validate total amount after adding
        const newTotalResult = this.validateTotalAmountAfterAdd(item);
        if (newTotalResult.isFailure) {
            return newTotalResult;
        }

        // Add the item
        this._items.set(item.id.value, item);
        this.invalidateTotalAmount();
        this.updateTimestamp();

        this.addEvent(new OrderItemAddedEvent(
            this.id.value,
            item.id.value,
            item.productName,
            item.quantity,
            item.unitPrice.amount,
            item.unitPrice.currency
        ));

        return Result.ok();
    }

    /**
     * Remove an item from the order
     */
    public removeItem(itemId: OrderItemId): Result {
        if (this._status.isFinal()) {
            return Result.fail(Error.domain(
                'Order.CannotModifyFinalOrder',
                `Cannot remove items from order in ${this._status} status`
            ));
        }

        const item = this._items.get(itemId.value);
        if (!item) {
            return Result.fail(Error.domain(
                'Order.ItemNotFound',
                `Item with ID ${itemId.value} not found in order`
            ));
        }

        this._items.delete(itemId.value);
        this.invalidateTotalAmount();
        this.updateTimestamp();

        this.addEvent(new OrderItemRemovedEvent(
            this.id.value,
            itemId.value,
            item.productName
        ));

        return Result.ok();
    }

    /**
     * Update the quantity of an existing item
     */
    public updateItemQuantity(itemId: OrderItemId, newQuantity: number): Result {
        if (this._status.isFinal()) {
            return Result.fail(Error.domain(
                'Order.CannotModifyFinalOrder',
                `Cannot update items in order in ${this._status} status`
            ));
        }

        const item = this._items.get(itemId.value);
        if (!item) {
            return Result.fail(Error.domain(
                'Order.ItemNotFound',
                `Item with ID ${itemId.value} not found in order`
            ));
        }

        try {
            const oldQuantity = item.quantity;
            item.updateQuantity(newQuantity);
            this.invalidateTotalAmount();
            this.updateTimestamp();

            this.addEvent(new OrderItemUpdatedEvent(
                this.id.value,
                itemId.value,
                item.productName,
                oldQuantity,
                newQuantity
            ));

            return Result.ok();
        } catch (error) {
            return Result.fail(Error.validation(
                'Order.InvalidQuantity',
                error instanceof Error ? error.message : 'Invalid quantity'
            ));
        }
    }

    /**
     * Confirm the order (transition from Pending to Confirmed)
     */
    public confirm(): Result {
        if (!this._status.canTransitionTo(OrderStatus.CONFIRMED)) {
            return Result.fail(Error.domain(
                'Order.InvalidStatusTransition',
                `Cannot confirm order in ${this._status} status`
            ));
        }

        if (this._items.size === 0) {
            return Result.fail(Error.domain(
                'Order.EmptyOrder',
                'Cannot confirm an empty order'
            ));
        }

        const previousStatus = this._status;
        this._status = OrderStatus.CONFIRMED;
        this.updateTimestamp();

        this.addEvent(new OrderStatusChangedEvent(
            this.id.value,
            previousStatus.value,
            this._status.value
        ));

        return Result.ok();
    }

    /**
     * Ship the order (transition from Confirmed to Shipped)
     */
    public ship(): Result {
        if (!this._status.canTransitionTo(OrderStatus.SHIPPED)) {
            return Result.fail(Error.domain(
                'Order.InvalidStatusTransition',
                `Cannot ship order in ${this._status} status`
            ));
        }

        const previousStatus = this._status;
        this._status = OrderStatus.SHIPPED;
        this.updateTimestamp();

        this.addEvent(new OrderStatusChangedEvent(
            this.id.value,
            previousStatus.value,
            this._status.value
        ));

        return Result.ok();
    }

    /**
     * Deliver the order (transition from Shipped to Delivered)
     */
    public deliver(): Result {
        if (!this._status.canTransitionTo(OrderStatus.DELIVERED)) {
            return Result.fail(Error.domain(
                'Order.InvalidStatusTransition',
                `Cannot deliver order in ${this._status} status`
            ));
        }

        const previousStatus = this._status;
        this._status = OrderStatus.DELIVERED;
        this.updateTimestamp();

        this.addEvent(new OrderStatusChangedEvent(
            this.id.value,
            previousStatus.value,
            this._status.value
        ));

        return Result.ok();
    }

    /**
     * Cancel the order
     */
    public cancel(): Result {
        if (!this._status.canBeCancelled()) {
            return Result.fail(Error.domain(
                'Order.CannotCancel',
                `Cannot cancel order in ${this._status} status`
            ));
        }

        const previousStatus = this._status;
        this._status = OrderStatus.CANCELLED;
        this.updateTimestamp();

        this.addEvent(new OrderStatusChangedEvent(
            this.id.value,
            previousStatus.value,
            this._status.value
        ));

        return Result.ok();
    }

    /**
     * Get an item by its ID
     */
    public getItem(itemId: OrderItemId): OrderItem | null {
        return this._items.get(itemId.value) || null;
    }

    /**
     * Check if order contains an item with the given product name
     */
    public hasProduct(productName: string): boolean {
        return this.findItemByProduct(productName) !== null;
    }

    /**
     * Get total amount for a specific currency (if order has items in multiple currencies)
     */
    public getTotalAmountByCurrency(currency: string): Money {
        const items = Array.from(this._items.values())
            .filter(item => item.totalPrice.currency === currency);

        if (items.length === 0) {
            return Money.zero(currency);
        }

        return items.reduce(
            (total, item) => total.add(item.totalPrice),
            Money.zero(currency)
        );
    }

    private findItemByProduct(productName: string): OrderItem | null {
        for (const item of this._items.values()) {
            if (item.productName === productName) {
                return item;
            }
        }
        return null;
    }

    private validateTotalAmountAfterAdd(newItem: OrderItem): Result {
        const currentTotal = this.totalAmount;

        // For this example, assume same currency validation
        if (this._items.size > 0 && currentTotal.currency !== newItem.totalPrice.currency) {
            return Result.fail(Error.validation(
                'Order.MixedCurrencies',
                `Cannot mix currencies in order: ${currentTotal.currency} and ${newItem.totalPrice.currency}`
            ));
        }

        // Business rule: Order total cannot exceed 100,000 in any currency
        const newTotal = this._items.size === 0
            ? newItem.totalPrice
            : currentTotal.add(newItem.totalPrice);

        if (newTotal.amount > 100000) {
            return Result.fail(Error.validation(
                'Order.ExceedsMaxAmount',
                `Order total ${newTotal} exceeds maximum allowed amount of 100,000`
            ));
        }

        return Result.ok();
    }

    private recalculateTotalAmount(): void {
        const items = Array.from(this._items.values());

        if (items.length === 0) {
            this._totalAmount = Money.zero('USD'); // Default currency
            return;
        }

        // Get currency from first item
        const currency = items[0].totalPrice.currency;
        this._totalAmount = items.reduce(
            (total, item) => total.add(item.totalPrice),
            Money.zero(currency)
        );
    }

    private invalidateTotalAmount(): void {
        this._totalAmount = null;
    }

    private updateTimestamp(): void {
        this._updatedAt = new Date();
    }

    /**
     * Create a new order with generated ID
     */
    public static create(customerId: CustomerId, correlationId?: string): Order {
        return new Order(OrderId.generate(), customerId, correlationId);
    }

    /**
     * Create order from existing data (for persistence)
     */
    public static fromData(
        id: OrderId,
        customerId: CustomerId,
        status: OrderStatus,
        items: OrderItem[],
        createdAt: Date,
        updatedAt: Date,
        version: number
    ): Order {
        const order = new Order(id, customerId);

        // Set internal state without triggering events (this is for rehydration)
        order._status = status;
        order._createdAt = createdAt;
        order._updatedAt = updatedAt;
        order.version = version;

        // Add items without triggering events
        for (const item of items) {
            order._items.set(item.id.value, item);
        }

        order.invalidateTotalAmount();
        order.clearEvents(); // Clear the creation event since this is rehydration

        return order;
    }
}