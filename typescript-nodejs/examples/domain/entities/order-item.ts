import { Entity } from '../../../src/domain/entity';
import { Money } from '../value-objects/money';

/**
 * OrderItem ID value object for strong typing
 */
export class OrderItemId {
    constructor(public readonly value: string) {
        if (!value || value.trim().length === 0) {
            throw new Error('OrderItem ID cannot be empty');
        }
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: OrderItemId): boolean {
        return this.value === other.value;
    }

    public static generate(): OrderItemId {
        return new OrderItemId(`item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }

    public static fromString(value: string): OrderItemId {
        return new OrderItemId(value);
    }
}

/**
 * OrderItem entity representing a line item in an order
 * Demonstrates Entity usage with business rules and invariants
 */
export class OrderItem extends Entity<OrderItemId> {
    private _productName: string;
    private _unitPrice: Money;
    private _quantity: number;
    private _totalPrice: Money;

    constructor(
        id: OrderItemId,
        productName: string,
        unitPrice: Money,
        quantity: number
    ) {
        super(id);

        this.validateProductName(productName);
        this.validateQuantity(quantity);
        this.validateUnitPrice(unitPrice);

        this._productName = productName;
        this._unitPrice = unitPrice;
        this._quantity = quantity;
        this._totalPrice = unitPrice.multiply(quantity);
    }

    // Getters
    public get productName(): string {
        return this._productName;
    }

    public get unitPrice(): Money {
        return this._unitPrice;
    }

    public get quantity(): number {
        return this._quantity;
    }

    public get totalPrice(): Money {
        return this._totalPrice;
    }

    /**
     * Update the quantity and recalculate total price
     */
    public updateQuantity(newQuantity: number): void {
        this.validateQuantity(newQuantity);
        this._quantity = newQuantity;
        this._totalPrice = this._unitPrice.multiply(newQuantity);
    }

    /**
     * Update the unit price and recalculate total price
     */
    public updateUnitPrice(newUnitPrice: Money): void {
        this.validateUnitPrice(newUnitPrice);
        this.ensureSameCurrency(newUnitPrice);
        this._unitPrice = newUnitPrice;
        this._totalPrice = newUnitPrice.multiply(this._quantity);
    }

    /**
     * Update product name
     */
    public updateProductName(newProductName: string): void {
        this.validateProductName(newProductName);
        this._productName = newProductName;
    }

    /**
     * Calculate discount amount for this item
     */
    public calculateDiscount(discountPercentage: number): Money {
        if (discountPercentage < 0 || discountPercentage > 100) {
            throw new Error('Discount percentage must be between 0 and 100');
        }

        const discountFactor = discountPercentage / 100;
        return this._totalPrice.multiply(discountFactor);
    }

    /**
     * Apply discount to this item and return new discounted item
     */
    public applyDiscount(discountPercentage: number): OrderItem {
        const discountAmount = this.calculateDiscount(discountPercentage);
        const discountedUnitPrice = this._unitPrice.subtract(discountAmount.multiply(1 / this._quantity));

        return new OrderItem(
            this.id,
            this._productName,
            discountedUnitPrice,
            this._quantity
        );
    }

    /**
     * Check if this item has the same product as another item
     */
    public hasSameProduct(other: OrderItem): boolean {
        return this._productName === other._productName &&
               this._unitPrice.equals(other._unitPrice);
    }

    /**
     * Merge with another item of the same product (combine quantities)
     */
    public mergeWith(other: OrderItem): OrderItem {
        if (!this.hasSameProduct(other)) {
            throw new Error('Cannot merge items with different products or prices');
        }

        return new OrderItem(
            this.id, // Keep the current item's ID
            this._productName,
            this._unitPrice,
            this._quantity + other._quantity
        );
    }

    private validateProductName(productName: string): void {
        if (!productName || productName.trim().length === 0) {
            throw new Error('Product name cannot be empty');
        }

        if (productName.length > 200) {
            throw new Error('Product name cannot exceed 200 characters');
        }
    }

    private validateQuantity(quantity: number): void {
        if (!Number.isInteger(quantity)) {
            throw new Error('Quantity must be a whole number');
        }

        if (quantity <= 0) {
            throw new Error('Quantity must be positive');
        }

        if (quantity > 10000) {
            throw new Error('Quantity cannot exceed 10,000');
        }
    }

    private validateUnitPrice(unitPrice: Money): void {
        if (!unitPrice.isPositive()) {
            throw new Error('Unit price must be positive');
        }
    }

    private ensureSameCurrency(newPrice: Money): void {
        if (this._unitPrice.currency !== newPrice.currency) {
            throw new Error(
                `Currency mismatch: existing ${this._unitPrice.currency}, new ${newPrice.currency}`
            );
        }
    }

    public toString(): string {
        return `${this._productName} x${this._quantity} @ ${this._unitPrice} = ${this._totalPrice}`;
    }

    /**
     * Create a new order item with generated ID
     */
    public static create(
        productName: string,
        unitPrice: Money,
        quantity: number
    ): OrderItem {
        return new OrderItem(
            OrderItemId.generate(),
            productName,
            unitPrice,
            quantity
        );
    }
}