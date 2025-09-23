import { ValueObject } from '../../../src/domain/value-object';

/**
 * OrderStatus value object demonstrating enumeration-style value objects
 */
export class OrderStatus extends ValueObject {
    private static readonly VALID_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'] as const;

    public static readonly PENDING = new OrderStatus('Pending');
    public static readonly CONFIRMED = new OrderStatus('Confirmed');
    public static readonly SHIPPED = new OrderStatus('Shipped');
    public static readonly DELIVERED = new OrderStatus('Delivered');
    public static readonly CANCELLED = new OrderStatus('Cancelled');

    public readonly value: typeof OrderStatus.VALID_STATUSES[number];

    private constructor(value: typeof OrderStatus.VALID_STATUSES[number]) {
        super();
        this.value = value;
    }

    protected getEqualityComponents(): unknown[] {
        return [this.value];
    }

    /**
     * Create OrderStatus from string value
     */
    public static fromString(value: string): OrderStatus {
        const normalizedValue = value.trim();

        if (!OrderStatus.VALID_STATUSES.includes(normalizedValue as any)) {
            throw new Error(`Invalid order status: ${value}. Valid statuses are: ${OrderStatus.VALID_STATUSES.join(', ')}`);
        }

        switch (normalizedValue) {
            case 'Pending': return OrderStatus.PENDING;
            case 'Confirmed': return OrderStatus.CONFIRMED;
            case 'Shipped': return OrderStatus.SHIPPED;
            case 'Delivered': return OrderStatus.DELIVERED;
            case 'Cancelled': return OrderStatus.CANCELLED;
            default: throw new Error(`Unexpected status: ${normalizedValue}`);
        }
    }

    /**
     * Check if this status can transition to another status
     */
    public canTransitionTo(targetStatus: OrderStatus): boolean {
        const transitions: Record<string, string[]> = {
            'Pending': ['Confirmed', 'Cancelled'],
            'Confirmed': ['Shipped', 'Cancelled'],
            'Shipped': ['Delivered'],
            'Delivered': [],
            'Cancelled': []
        };

        return transitions[this.value]?.includes(targetStatus.value) ?? false;
    }

    /**
     * Get all valid transition statuses from current status
     */
    public getValidTransitions(): OrderStatus[] {
        const transitions: Record<string, OrderStatus[]> = {
            'Pending': [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            'Confirmed': [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            'Shipped': [OrderStatus.DELIVERED],
            'Delivered': [],
            'Cancelled': []
        };

        return transitions[this.value] ?? [];
    }

    /**
     * Check if order is in a final state (cannot transition further)
     */
    public isFinal(): boolean {
        return this.value === 'Delivered' || this.value === 'Cancelled';
    }

    /**
     * Check if order can be cancelled
     */
    public canBeCancelled(): boolean {
        return this.value === 'Pending';
    }

    /**
     * Check if order is active (not cancelled or delivered)
     */
    public isActive(): boolean {
        return !this.isFinal();
    }

    public override toString(): string {
        return this.value;
    }

    /**
     * Get all possible statuses
     */
    public static getAllStatuses(): OrderStatus[] {
        return [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED
        ];
    }
}