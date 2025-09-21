import { Result, ResultOf, Error } from '../../../src/functional';
import { Order, OrderId, CustomerId } from '../entities/order';
import { OrderItem } from '../entities/order-item';
import { Money } from '../value-objects/money';
import { OrderStatus } from '../value-objects/order-status';

/**
 * Pricing strategy interface for order calculations
 */
export interface IPricingStrategy {
    calculateDiscount(order: Order): Money;
    calculateShipping(order: Order): Money;
    calculateTax(order: Order): Money;
}

/**
 * Standard pricing strategy implementation
 */
export class StandardPricingStrategy implements IPricingStrategy {
    calculateDiscount(order: Order): Money {
        const totalAmount = order.totalAmount;

        // Volume discounts
        if (totalAmount.amount >= 1000) {
            return totalAmount.multiply(0.1); // 10% discount for orders over 1000
        } else if (totalAmount.amount >= 500) {
            return totalAmount.multiply(0.05); // 5% discount for orders over 500
        } else if (order.itemCount >= 10) {
            return totalAmount.multiply(0.02); // 2% discount for 10+ items
        }

        return Money.zero(totalAmount.currency);
    }

    calculateShipping(order: Order): Money {
        const totalAmount = order.totalAmount;

        // Free shipping for orders over 100
        if (totalAmount.amount >= 100) {
            return Money.zero(totalAmount.currency);
        }

        // Standard shipping rate
        return new Money(10, totalAmount.currency);
    }

    calculateTax(order: Order): Money {
        const totalAmount = order.totalAmount;
        const taxRate = 0.08; // 8% tax rate
        return totalAmount.multiply(taxRate);
    }
}

/**
 * Premium customer pricing strategy
 */
export class PremiumPricingStrategy implements IPricingStrategy {
    calculateDiscount(order: Order): Money {
        const totalAmount = order.totalAmount;
        // Premium customers get 15% discount on everything
        return totalAmount.multiply(0.15);
    }

    calculateShipping(order: Order): Money {
        // Free shipping for premium customers
        return Money.zero(order.totalAmount.currency);
    }

    calculateTax(order: Order): Money {
        const totalAmount = order.totalAmount;
        const taxRate = 0.08; // Same tax rate
        return totalAmount.multiply(taxRate);
    }
}

/**
 * Order calculation result
 */
export interface OrderCalculation {
    subtotal: Money;
    discount: Money;
    shipping: Money;
    tax: Money;
    total: Money;
}

/**
 * Order validation result
 */
export interface OrderValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * OrderService - Domain service for complex order operations
 * Handles business logic that doesn't naturally fit in a single aggregate
 */
export class OrderService {
    constructor(private readonly pricingStrategy: IPricingStrategy) {}

    /**
     * Calculate complete order totals including discounts, shipping, and tax
     */
    public calculateOrderTotals(order: Order): ResultOf<OrderCalculation> {
        try {
            const subtotal = order.totalAmount;

            if (subtotal.isZero()) {
                return Result.fail(Error.validation(
                    'OrderService.EmptyOrder',
                    'Cannot calculate totals for empty order'
                ));
            }

            const discount = this.pricingStrategy.calculateDiscount(order);
            const shipping = this.pricingStrategy.calculateShipping(order);

            // Calculate tax on subtotal minus discount plus shipping
            const taxableAmount = subtotal.subtract(discount).add(shipping);
            const tax = this.calculateTaxOnAmount(taxableAmount);

            const total = subtotal
                .subtract(discount)
                .add(shipping)
                .add(tax);

            return Result.ok({
                subtotal,
                discount,
                shipping,
                tax,
                total
            });
        } catch (error) {
            return Result.fail(Error.domain(
                'OrderService.CalculationError',
                error instanceof Error ? error.message : 'Failed to calculate order totals'
            ));
        }
    }

    /**
     * Validate order for business rules compliance
     */
    public validateOrder(order: Order): OrderValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if order has items
        if (order.itemCount === 0) {
            errors.push('Order must contain at least one item');
        }

        // Check for minimum order amount
        if (order.totalAmount.amount < 1) {
            errors.push('Order total must be at least 1.00');
        }

        // Check for maximum order amount
        if (order.totalAmount.amount > 50000) {
            errors.push('Order total cannot exceed 50,000');
        }

        // Check for too many items (warning)
        if (order.itemCount > 50) {
            warnings.push('Order contains more than 50 items - consider splitting');
        }

        // Check for high-value items (warning)
        for (const item of order.items) {
            if (item.unitPrice.amount > 1000) {
                warnings.push(`High-value item detected: ${item.productName} (${item.unitPrice})`);
            }
        }

        // Check for quantity limits
        for (const item of order.items) {
            if (item.quantity > 100) {
                warnings.push(`High quantity for ${item.productName}: ${item.quantity} units`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Suggest order optimizations
     */
    public suggestOptimizations(order: Order): string[] {
        const suggestions: string[] = [];

        const calculation = this.calculateOrderTotals(order);
        if (calculation.isFailure) {
            return suggestions;
        }

        const totals = calculation.value;

        // Suggest adding more items for free shipping
        if (!totals.shipping.isZero()) {
            const amountNeeded = new Money(100, totals.subtotal.currency).subtract(totals.subtotal);
            if (amountNeeded.amount > 0 && amountNeeded.amount <= 50) {
                suggestions.push(
                    `Add ${amountNeeded} more to qualify for free shipping`
                );
            }
        }

        // Suggest volume discounts
        if (totals.subtotal.amount >= 400 && totals.subtotal.amount < 500) {
            const amountNeeded = new Money(500, totals.subtotal.currency).subtract(totals.subtotal);
            suggestions.push(
                `Add ${amountNeeded} more to qualify for 5% volume discount`
            );
        }

        if (totals.subtotal.amount >= 800 && totals.subtotal.amount < 1000) {
            const amountNeeded = new Money(1000, totals.subtotal.currency).subtract(totals.subtotal);
            suggestions.push(
                `Add ${amountNeeded} more to qualify for 10% volume discount`
            );
        }

        // Suggest item consolidation
        const duplicateProducts = this.findDuplicateProducts(order);
        if (duplicateProducts.length > 0) {
            suggestions.push(
                `Consider consolidating duplicate products: ${duplicateProducts.join(', ')}`
            );
        }

        return suggestions;
    }

    /**
     * Check if two orders can be merged
     */
    public canMergeOrders(order1: Order, order2: Order): ResultOf<boolean> {
        // Orders must be for the same customer
        if (!order1.customerId.equals(order2.customerId)) {
            return Result.fail(Error.domain(
                'OrderService.DifferentCustomers',
                'Cannot merge orders from different customers'
            ));
        }

        // Orders must be in pending status
        if (order1.status !== OrderStatus.PENDING || order2.status !== OrderStatus.PENDING) {
            return Result.fail(Error.domain(
                'OrderService.InvalidStatusForMerge',
                'Can only merge orders in pending status'
            ));
        }

        // Check currency compatibility
        if (order1.totalAmount.currency !== order2.totalAmount.currency) {
            return Result.fail(Error.domain(
                'OrderService.CurrencyMismatch',
                'Cannot merge orders with different currencies'
            ));
        }

        // Check if merged order would exceed limits
        const combinedAmount = order1.totalAmount.add(order2.totalAmount);
        if (combinedAmount.amount > 50000) {
            return Result.fail(Error.domain(
                'OrderService.ExceedsMaxAmount',
                'Merged order would exceed maximum order amount'
            ));
        }

        const combinedItemCount = order1.itemCount + order2.itemCount;
        if (combinedItemCount > 100) {
            return Result.fail(Error.domain(
                'OrderService.TooManyItems',
                'Merged order would have too many items'
            ));
        }

        return Result.ok(true);
    }

    /**
     * Create a new order by merging two existing orders
     */
    public mergeOrders(order1: Order, order2: Order): ResultOf<Order> {
        const canMergeResult = this.canMergeOrders(order1, order2);
        if (canMergeResult.isFailure) {
            return canMergeResult.error;
        }

        try {
            const mergedOrder = Order.create(order1.customerId);

            // Add all items from both orders
            for (const item of order1.items) {
                const addResult = mergedOrder.addItem(item);
                if (addResult.isFailure) {
                    return addResult.error;
                }
            }

            for (const item of order2.items) {
                const addResult = mergedOrder.addItem(item);
                if (addResult.isFailure) {
                    return addResult.error;
                }
            }

            return Result.ok(mergedOrder);
        } catch (error) {
            return Result.fail(Error.domain(
                'OrderService.MergeError',
                error instanceof Error ? error.message : 'Failed to merge orders'
            ));
        }
    }

    /**
     * Split an order into multiple orders based on criteria
     */
    public splitOrderByQuantity(order: Order, maxItemsPerOrder: number): ResultOf<Order[]> {
        if (maxItemsPerOrder <= 0) {
            return Result.fail(Error.validation(
                'OrderService.InvalidSplitCriteria',
                'Max items per order must be positive'
            ));
        }

        if (order.itemCount <= maxItemsPerOrder) {
            return Result.ok([order]); // No need to split
        }

        try {
            const orders: Order[] = [];
            const items = Array.from(order.items);
            let currentOrder = Order.create(order.customerId);

            for (const item of items) {
                if (currentOrder.itemCount >= maxItemsPerOrder) {
                    orders.push(currentOrder);
                    currentOrder = Order.create(order.customerId);
                }

                const addResult = currentOrder.addItem(item);
                if (addResult.isFailure) {
                    return addResult.error;
                }
            }

            // Add the last order if it has items
            if (currentOrder.itemCount > 0) {
                orders.push(currentOrder);
            }

            return Result.ok(orders);
        } catch (error) {
            return Result.fail(Error.domain(
                'OrderService.SplitError',
                error instanceof Error ? error.message : 'Failed to split order'
            ));
        }
    }

    private calculateTaxOnAmount(amount: Money): Money {
        return this.pricingStrategy.calculateTax(
            Order.create(new CustomerId('temp-customer-id'))
        );
    }

    private findDuplicateProducts(order: Order): string[] {
        const productCounts = new Map<string, number>();

        for (const item of order.items) {
            const count = productCounts.get(item.productName) || 0;
            productCounts.set(item.productName, count + 1);
        }

        return Array.from(productCounts.entries())
            .filter(([_, count]) => count > 1)
            .map(([productName, _]) => productName);
    }
}