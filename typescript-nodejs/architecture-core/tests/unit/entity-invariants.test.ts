/**
 * Entity Invariant Enforcement Unit Tests
 * Architecture.Core TypeScript Implementation
 */

import { Entity } from '../../src/domain/entity';
import { ValueObject } from '../../src/domain/value-object';

// Test ID value objects
class UserId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        if (!value || value.trim() === '') {
            throw new Error('UserId cannot be empty');
        }
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.value];
    }

    override toString(): string {
        return this.value;
    }

    static create(value: string): UserId {
        return new UserId(value);
    }
}

class ProductId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        if (!value || value.trim() === '') {
            throw new Error('ProductId cannot be empty');
        }
        if (!/^PROD-\d+$/.test(value)) {
            throw new Error('ProductId must follow format PROD-{number}');
        }
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.value];
    }

    override toString(): string {
        return this.value;
    }

    static create(value: string): ProductId {
        return new ProductId(value);
    }
}

class OrderId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        if (!value || value.trim() === '') {
            throw new Error('OrderId cannot be empty');
        }
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.value];
    }

    override toString(): string {
        return this.value;
    }

    static create(value: string): OrderId {
        return new OrderId(value);
    }
}

// Test Entity implementations with invariants
class User extends Entity<UserId> {
    private _email!: string;
    private _isActive: boolean;
    private _createdAt: Date;
    private _lastLoginAt?: Date;

    constructor(id: UserId, email: string) {
        super(id);
        this.setEmail(email);
        this._isActive = true;
        this._createdAt = new Date();
    }

    get email(): string {
        return this._email;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get lastLoginAt(): Date | undefined {
        return this._lastLoginAt;
    }

    // Invariant: Email must be valid format
    private setEmail(email: string): void {
        if (!email || email.trim() === '') {
            throw new Error('Email cannot be empty');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Email must be in valid format');
        }
        this._email = email;
    }

    public changeEmail(newEmail: string): void {
        this.setEmail(newEmail);
    }

    public activate(): void {
        this._isActive = true;
    }

    public deactivate(): void {
        this._isActive = false;
    }

    public recordLogin(): void {
        if (!this._isActive) {
            throw new Error('Cannot record login for inactive user');
        }
        this._lastLoginAt = new Date();
    }

    // Invariant: Active users must have valid email
    private validateInvariants(): void {
        if (this._isActive && (!this._email || this._email.trim() === '')) {
            throw new Error('Active user must have valid email');
        }
    }
}

class Product extends Entity<ProductId> {
    private _name!: string;
    private _price!: number;
    private _category!: string;
    private _isAvailable!: boolean;
    private _stockQuantity!: number;

    constructor(id: ProductId, name: string, price: number, category: string, stockQuantity: number = 0) {
        super(id);
        this.setName(name);
        this.setPrice(price);
        this.setCategory(category);
        this.setStockQuantity(stockQuantity);
        this._isAvailable = true;
    }

    get name(): string {
        return this._name;
    }

    get price(): number {
        return this._price;
    }

    get category(): string {
        return this._category;
    }

    get isAvailable(): boolean {
        return this._isAvailable;
    }

    get stockQuantity(): number {
        return this._stockQuantity;
    }

    // Invariant: Name must not be empty
    private setName(name: string): void {
        if (!name || name.trim() === '') {
            throw new Error('Product name cannot be empty');
        }
        if (name.length > 200) {
            throw new Error('Product name cannot exceed 200 characters');
        }
        this._name = name.trim();
    }

    // Invariant: Price must be non-negative
    private setPrice(price: number): void {
        if (price < 0) {
            throw new Error('Product price cannot be negative');
        }
        if (price > 1000000) {
            throw new Error('Product price cannot exceed $1,000,000');
        }
        this._price = price;
    }

    // Invariant: Category must be valid
    private setCategory(category: string): void {
        const validCategories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Beauty'];
        if (!validCategories.includes(category)) {
            throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
        }
        this._category = category;
    }

    // Invariant: Stock quantity must be non-negative
    private setStockQuantity(quantity: number): void {
        if (quantity < 0) {
            throw new Error('Stock quantity cannot be negative');
        }
        if (quantity > 100000) {
            throw new Error('Stock quantity cannot exceed 100,000');
        }
        this._stockQuantity = quantity;
    }

    public updateName(newName: string): void {
        this.setName(newName);
    }

    public updatePrice(newPrice: number): void {
        this.setPrice(newPrice);
        this.validatePriceAvailabilityInvariant();
    }

    public updateCategory(newCategory: string): void {
        this.setCategory(newCategory);
    }

    public addStock(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Quantity to add must be positive');
        }
        this.setStockQuantity(this._stockQuantity + quantity);

        // Auto-enable availability if stock added
        if (this._stockQuantity > 0 && !this._isAvailable) {
            this._isAvailable = true;
        }
    }

    public removeStock(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Quantity to remove must be positive');
        }
        if (quantity > this._stockQuantity) {
            throw new Error('Cannot remove more stock than available');
        }
        this.setStockQuantity(this._stockQuantity - quantity);

        // Auto-disable availability if out of stock
        if (this._stockQuantity === 0) {
            this._isAvailable = false;
        }
    }

    public makeAvailable(): void {
        if (this._stockQuantity === 0) {
            throw new Error('Cannot make product available when out of stock');
        }
        this._isAvailable = true;
    }

    public makeUnavailable(): void {
        this._isAvailable = false;
    }

    // Business invariant: Products with zero price must be unavailable
    private validatePriceAvailabilityInvariant(): void {
        if (this._price === 0 && this._isAvailable) {
            throw new Error('Products with zero price cannot be available');
        }
    }
}

// Complex entity with cross-field invariants
class Order extends Entity<OrderId> {
    private _items: Array<{ productId: ProductId; quantity: number; unitPrice: number }> = [];
    private _status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    private _customerId: UserId;
    private _orderDate: Date;
    private _shippingAddress?: string;

    constructor(id: OrderId, customerId: UserId) {
        super(id);
        this._customerId = customerId;
        this._status = 'pending';
        this._orderDate = new Date();
    }

    get items(): ReadonlyArray<{ productId: ProductId; quantity: number; unitPrice: number }> {
        return [...this._items];
    }

    get status(): string {
        return this._status;
    }

    get customerId(): UserId {
        return this._customerId;
    }

    get orderDate(): Date {
        return this._orderDate;
    }

    get shippingAddress(): string | undefined {
        return this._shippingAddress;
    }

    get totalAmount(): number {
        return this._items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
    }

    public addItem(productId: ProductId, quantity: number, unitPrice: number): void {
        this.validateCanModifyItems();
        this.validateItemParameters(quantity, unitPrice);

        // Check if item already exists
        const existingItemIndex = this._items.findIndex(item => item.productId.equals(productId));
        if (existingItemIndex >= 0) {
            // Update existing item
            this._items[existingItemIndex]!.quantity += quantity;
        } else {
            // Add new item
            this._items.push({ productId, quantity, unitPrice });
        }

        this.validateOrderInvariants();
    }

    public removeItem(productId: ProductId): void {
        this.validateCanModifyItems();

        const itemIndex = this._items.findIndex(item => item.productId.equals(productId));
        if (itemIndex === -1) {
            throw new Error('Item not found in order');
        }

        this._items.splice(itemIndex, 1);
        this.validateOrderInvariants();
    }

    public updateItemQuantity(productId: ProductId, newQuantity: number): void {
        this.validateCanModifyItems();
        this.validateItemParameters(newQuantity, 0);

        const item = this._items.find(item => item.productId.equals(productId));
        if (!item) {
            throw new Error('Item not found in order');
        }

        item.quantity = newQuantity;
        this.validateOrderInvariants();
    }

    public setShippingAddress(address: string): void {
        if (this._status !== 'pending' && this._status !== 'confirmed') {
            throw new Error('Cannot change shipping address after order has shipped');
        }
        if (!address || address.trim() === '') {
            throw new Error('Shipping address cannot be empty');
        }
        if (address.length > 500) {
            throw new Error('Shipping address cannot exceed 500 characters');
        }
        this._shippingAddress = address.trim();
    }

    public confirm(): void {
        if (this._status !== 'pending') {
            throw new Error(`Cannot confirm order with status: ${this._status}`);
        }
        if (this._items.length === 0) {
            throw new Error('Cannot confirm order with no items');
        }
        if (!this._shippingAddress) {
            throw new Error('Cannot confirm order without shipping address');
        }
        this._status = 'confirmed';
    }

    public ship(): void {
        if (this._status !== 'confirmed') {
            throw new Error(`Cannot ship order with status: ${this._status}`);
        }
        this._status = 'shipped';
    }

    public deliver(): void {
        if (this._status !== 'shipped') {
            throw new Error(`Cannot deliver order with status: ${this._status}`);
        }
        this._status = 'delivered';
    }

    public cancel(): void {
        if (this._status === 'delivered') {
            throw new Error('Cannot cancel delivered order');
        }
        if (this._status === 'cancelled') {
            throw new Error('Order is already cancelled');
        }
        this._status = 'cancelled';
    }

    // Invariant validation methods
    private validateCanModifyItems(): void {
        if (this._status !== 'pending') {
            throw new Error(`Cannot modify items when order status is: ${this._status}`);
        }
    }

    private validateItemParameters(quantity: number, unitPrice: number): void {
        if (quantity <= 0) {
            throw new Error('Item quantity must be positive');
        }
        if (quantity > 1000) {
            throw new Error('Item quantity cannot exceed 1000');
        }
        if (unitPrice < 0) {
            throw new Error('Item unit price cannot be negative');
        }
        if (unitPrice > 100000) {
            throw new Error('Item unit price cannot exceed $100,000');
        }
    }

    private validateOrderInvariants(): void {
        // Invariant: Order total cannot exceed $1,000,000
        if (this.totalAmount > 1000000) {
            throw new Error('Order total cannot exceed $1,000,000');
        }

        // Invariant: Order cannot have more than 50 items
        if (this._items.length > 50) {
            throw new Error('Order cannot have more than 50 items');
        }

        // Invariant: All item quantities must be positive
        for (const item of this._items) {
            if (item.quantity <= 0) {
                throw new Error('All items must have positive quantities');
            }
        }
    }
}

describe('Entity Invariant Enforcement Tests', () => {
    describe('Basic Entity Invariants', () => {
        test('Should_CreateUser_When_ValidDataProvided', () => {
            // Given
            const userId = UserId.create('user123');
            const email = 'test@example.com';

            // When
            const user = new User(userId, email);

            // Then
            expect(user.id).toBe(userId);
            expect(user.email).toBe(email);
            expect(user.isActive).toBe(true);
            expect(user.createdAt).toBeInstanceOf(Date);
        });

        test('Should_ThrowError_When_InvalidEmailProvided', () => {
            // Given
            const userId = UserId.create('user123');
            const emptyEmails = ['', '   '];
            const invalidFormatEmails = ['invalid-email', 'test@', '@example.com', 'test@.com'];

            // When & Then
            emptyEmails.forEach(email => {
                expect(() => new User(userId, email)).toThrow('Email cannot be empty');
            });

            invalidFormatEmails.forEach(email => {
                expect(() => new User(userId, email)).toThrow('Email must be in valid format');
            });
        });

        test('Should_AllowEmailChange_When_ValidEmailProvided', () => {
            // Given
            const user = new User(UserId.create('user123'), 'old@example.com');
            const newEmail = 'new@example.com';

            // When
            user.changeEmail(newEmail);

            // Then
            expect(user.email).toBe(newEmail);
        });

        test('Should_ThrowError_When_InvalidEmailChangeAttempted', () => {
            // Given
            const user = new User(UserId.create('user123'), 'valid@example.com');

            // When & Then
            expect(() => user.changeEmail('invalid-email')).toThrow('Email must be in valid format');
            expect(user.email).toBe('valid@example.com'); // Should remain unchanged
        });
    });

    describe('Product Entity Invariants', () => {
        test('Should_CreateProduct_When_ValidDataProvided', () => {
            // Given
            const productId = ProductId.create('PROD-123');
            const name = 'Test Product';
            const price = 99.99;
            const category = 'Electronics';
            const stock = 10;

            // When
            const product = new Product(productId, name, price, category, stock);

            // Then
            expect(product.id).toBe(productId);
            expect(product.name).toBe(name);
            expect(product.price).toBe(price);
            expect(product.category).toBe(category);
            expect(product.stockQuantity).toBe(stock);
            expect(product.isAvailable).toBe(true);
        });

        test('Should_ThrowError_When_InvalidProductDataProvided', () => {
            // Given
            const productId = ProductId.create('PROD-123');

            // When & Then
            expect(() => new Product(productId, '', 99.99, 'Electronics')).toThrow('Product name cannot be empty');
            expect(() => new Product(productId, 'Test', -1, 'Electronics')).toThrow('Product price cannot be negative');
            expect(() => new Product(productId, 'Test', 99.99, 'InvalidCategory')).toThrow('Invalid category');
            expect(() => new Product(productId, 'Test', 99.99, 'Electronics', -1)).toThrow('Stock quantity cannot be negative');
        });

        test('Should_EnforceNameLengthInvariant_When_UpdatingName', () => {
            // Given
            const product = new Product(ProductId.create('PROD-123'), 'Test Product', 99.99, 'Electronics');
            const longName = 'x'.repeat(201);

            // When & Then
            expect(() => product.updateName(longName)).toThrow('Product name cannot exceed 200 characters');
        });

        test('Should_EnforcePriceLimits_When_UpdatingPrice', () => {
            // Given
            const product = new Product(ProductId.create('PROD-123'), 'Test Product', 99.99, 'Electronics');

            // When & Then
            expect(() => product.updatePrice(-1)).toThrow('Product price cannot be negative');
            expect(() => product.updatePrice(1000001)).toThrow('Product price cannot exceed $1,000,000');
        });

        test('Should_ManageAvailability_When_StockChanges', () => {
            // Given
            const product = new Product(ProductId.create('PROD-123'), 'Test Product', 99.99, 'Electronics', 5);

            // When - Remove all stock
            product.removeStock(5);

            // Then
            expect(product.stockQuantity).toBe(0);
            expect(product.isAvailable).toBe(false);

            // When - Add stock back
            product.addStock(10);

            // Then
            expect(product.stockQuantity).toBe(10);
            expect(product.isAvailable).toBe(true);
        });

        test('Should_ThrowError_When_MakingOutOfStockProductAvailable', () => {
            // Given
            const product = new Product(ProductId.create('PROD-123'), 'Test Product', 99.99, 'Electronics', 0);

            // When & Then
            expect(() => product.makeAvailable()).toThrow('Cannot make product available when out of stock');
        });

        test('Should_EnforceStockInvariants_When_ModifyingStock', () => {
            // Given
            const product = new Product(ProductId.create('PROD-123'), 'Test Product', 99.99, 'Electronics', 10);

            // When & Then
            expect(() => product.addStock(-1)).toThrow('Quantity to add must be positive');
            expect(() => product.removeStock(-1)).toThrow('Quantity to remove must be positive');
            expect(() => product.removeStock(15)).toThrow('Cannot remove more stock than available');
        });
    });

    describe('Complex Entity Invariants (Order)', () => {
        test('Should_CreateOrder_When_ValidDataProvided', () => {
            // Given
            const orderId = OrderId.create('ORD-123');
            const customerId = UserId.create('customer123');

            // When
            const order = new Order(orderId, customerId);

            // Then
            expect(order.id).toBe(orderId);
            expect(order.customerId).toBe(customerId);
            expect(order.status).toBe('pending');
            expect(order.items).toHaveLength(0);
            expect(order.totalAmount).toBe(0);
        });

        test('Should_AddItems_When_OrderPending', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            const productId = ProductId.create('PROD-123');

            // When
            order.addItem(productId, 2, 50.00);

            // Then
            expect(order.items).toHaveLength(1);
            expect(order.items[0]!.productId).toBe(productId);
            expect(order.items[0]!.quantity).toBe(2);
            expect(order.items[0]!.unitPrice).toBe(50.00);
            expect(order.totalAmount).toBe(100.00);
        });

        test('Should_ThrowError_When_AddingItemsToNonPendingOrder', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            order.setShippingAddress('123 Test St');
            order.addItem(ProductId.create('PROD-123'), 1, 50.00);
            order.confirm();

            // When & Then
            expect(() => order.addItem(ProductId.create('PROD-456'), 1, 25.00))
                .toThrow('Cannot modify items when order status is: confirmed');
        });

        test('Should_UpdateExistingItem_When_AddingSameProduct', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            const productId = ProductId.create('PROD-123');

            // When
            order.addItem(productId, 2, 50.00);
            order.addItem(productId, 3, 50.00); // Same product

            // Then
            expect(order.items).toHaveLength(1);
            expect(order.items[0]!.quantity).toBe(5); // 2 + 3
            expect(order.totalAmount).toBe(250.00); // 5 * 50
        });

        test('Should_EnforceItemInvariants_When_AddingItems', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            const productId = ProductId.create('PROD-123');

            // When & Then
            expect(() => order.addItem(productId, 0, 50.00)).toThrow('Item quantity must be positive');
            expect(() => order.addItem(productId, -1, 50.00)).toThrow('Item quantity must be positive');
            expect(() => order.addItem(productId, 1001, 50.00)).toThrow('Item quantity cannot exceed 1000');
            expect(() => order.addItem(productId, 1, -1)).toThrow('Item unit price cannot be negative');
            expect(() => order.addItem(productId, 1, 100001)).toThrow('Item unit price cannot exceed $100,000');
        });

        test('Should_EnforceOrderTotalLimit_When_AddingExpensiveItems', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            const productId1 = ProductId.create('PROD-123');
            const productId2 = ProductId.create('PROD-456');

            // When
            order.addItem(productId1, 10, 90000); // $900,000

            // Then - Should be able to add up to limit
            expect(() => order.addItem(productId2, 1, 100000)).not.toThrow(); // Total: $1,000,000

            // Then - Should throw when exceeding limit
            const productId3 = ProductId.create('PROD-789');
            expect(() => order.addItem(productId3, 1, 1))
                .toThrow('Order total cannot exceed $1,000,000');
        });

        test('Should_EnforceItemCountLimit_When_AddingManyItems', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));

            // When - Add 50 items (at the limit)
            for (let i = 1; i <= 50; i++) {
                order.addItem(ProductId.create(`PROD-${i}`), 1, 10.00);
            }

            // Then - Should throw when adding 51st item
            expect(() => order.addItem(ProductId.create('PROD-51'), 1, 10.00))
                .toThrow('Order cannot have more than 50 items');
        });

        test('Should_EnforceShippingAddressInvariant_When_Confirming', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            order.addItem(ProductId.create('PROD-123'), 1, 50.00);

            // When & Then - Cannot confirm without shipping address
            expect(() => order.confirm()).toThrow('Cannot confirm order without shipping address');

            // When - Set shipping address
            order.setShippingAddress('123 Test St');

            // Then - Should be able to confirm
            expect(() => order.confirm()).not.toThrow();
            expect(order.status).toBe('confirmed');
        });

        test('Should_EnforceStatusTransitionInvariants_When_ChangingStatus', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            order.addItem(ProductId.create('PROD-123'), 1, 50.00);
            order.setShippingAddress('123 Test St');

            // When & Then - Test valid transitions
            expect(() => order.confirm()).not.toThrow();
            expect(order.status).toBe('confirmed');

            expect(() => order.ship()).not.toThrow();
            expect(order.status).toBe('shipped');

            expect(() => order.deliver()).not.toThrow();
            expect(order.status).toBe('delivered');

            // Then - Cannot cancel delivered order
            expect(() => order.cancel()).toThrow('Cannot cancel delivered order');
        });

        test('Should_ThrowError_When_InvalidStatusTransitionAttempted', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));

            // When & Then - Test invalid transitions
            expect(() => order.ship()).toThrow('Cannot ship order with status: pending');
            expect(() => order.deliver()).toThrow('Cannot deliver order with status: pending');
        });

        test('Should_ValidateShippingAddressInvariants_When_Setting', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));

            // When & Then
            expect(() => order.setShippingAddress('')).toThrow('Shipping address cannot be empty');
            expect(() => order.setShippingAddress('   ')).toThrow('Shipping address cannot be empty');
            expect(() => order.setShippingAddress('x'.repeat(501))).toThrow('Shipping address cannot exceed 500 characters');

            // Valid address should work
            expect(() => order.setShippingAddress('123 Valid Street')).not.toThrow();
        });
    });

    describe('Cross-Entity Invariant Scenarios', () => {
        test('Should_EnforceInvariants_When_CombiningMultipleEntities', () => {
            // Given
            const user = new User(UserId.create('user123'), 'test@example.com');
            const product = new Product(ProductId.create('PROD-123'), 'Test Product', 99.99, 'Electronics', 10);
            const order = new Order(OrderId.create('ORD-123'), user.id);

            // When
            order.addItem(product.id, 2, product.price);
            order.setShippingAddress('123 Test Street');

            // Then - All invariants should be maintained
            expect(user.isActive).toBe(true);
            expect(product.isAvailable).toBe(true);
            expect(order.totalAmount).toBe(199.98);
            expect(() => order.confirm()).not.toThrow();
        });

        test('Should_MaintainInvariants_When_ModifyingRelatedEntities', () => {
            // Given
            const user = new User(UserId.create('user123'), 'test@example.com');
            const product = new Product(ProductId.create('PROD-123'), 'Test Product', 99.99, 'Electronics', 5);
            const order = new Order(OrderId.create('ORD-123'), user.id);

            order.addItem(product.id, 3, product.price);
            order.setShippingAddress('123 Test Street');
            order.confirm();

            // When - Deactivate user (should not affect confirmed order)
            user.deactivate();

            // Then - Order should remain valid
            expect(user.isActive).toBe(false);
            expect(order.status).toBe('confirmed');

            // When - Make product unavailable (should not affect confirmed order)
            product.makeUnavailable();

            // Then - Order should still be valid
            expect(product.isAvailable).toBe(false);
            expect(order.status).toBe('confirmed');
            expect(() => order.ship()).not.toThrow();
        });
    });

    describe('Invariant Recovery Scenarios', () => {
        test('Should_RecoverFromInvariantViolationAttempts_When_ExceptionThrown', () => {
            // Given
            const product = new Product(ProductId.create('PROD-123'), 'Valid Product', 99.99, 'Electronics', 10);
            const originalName = product.name;
            const originalPrice = product.price;

            // When - Attempt invalid updates
            expect(() => product.updateName('')).toThrow();
            expect(() => product.updatePrice(-1)).toThrow();

            // Then - Product should remain in valid state
            expect(product.name).toBe(originalName);
            expect(product.price).toBe(originalPrice);
            expect(product.isAvailable).toBe(true);
        });

        test('Should_MaintainConsistency_When_PartialOperationFails', () => {
            // Given
            const order = new Order(OrderId.create('ORD-123'), UserId.create('customer123'));
            const productId = ProductId.create('PROD-123');

            order.addItem(productId, 1, 50.00);
            const originalItemCount = order.items.length;
            const originalTotal = order.totalAmount;

            // When - Attempt to add invalid item
            expect(() => order.addItem(ProductId.create('PROD-456'), -1, 25.00)).toThrow();

            // Then - Order should remain in previous valid state
            expect(order.items.length).toBe(originalItemCount);
            expect(order.totalAmount).toBe(originalTotal);
        });
    });
});