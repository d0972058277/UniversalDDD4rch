import { ValueObject } from '../../../src/domain/value-object';

/**
 * Money value object representing an amount with currency
 * Demonstrates ValueObject usage with multi-field equality
 */
export class Money extends ValueObject {
    public readonly amount: number;
    public readonly currency: string;

    constructor(amount: number, currency: string) {
        super();

        if (amount < 0) {
            throw new Error('Amount cannot be negative');
        }

        if (!currency || currency.trim().length === 0) {
            throw new Error('Currency cannot be empty');
        }

        if (currency.length !== 3) {
            throw new Error('Currency must be 3-character ISO code');
        }

        this.amount = amount;
        this.currency = currency.toUpperCase();
    }

    protected getEqualityComponents(): unknown[] {
        return [this.amount, this.currency];
    }

    /**
     * Add two money amounts (must be same currency)
     */
    public add(other: Money): Money {
        if (this.currency !== other.currency) {
            throw new Error(`Cannot add different currencies: ${this.currency} and ${other.currency}`);
        }
        return new Money(this.amount + other.amount, this.currency);
    }

    /**
     * Subtract two money amounts (must be same currency)
     */
    public subtract(other: Money): Money {
        if (this.currency !== other.currency) {
            throw new Error(`Cannot subtract different currencies: ${this.currency} and ${other.currency}`);
        }
        return new Money(this.amount - other.amount, this.currency);
    }

    /**
     * Multiply money by a factor
     */
    public multiply(factor: number): Money {
        return new Money(this.amount * factor, this.currency);
    }

    /**
     * Check if this amount is zero
     */
    public isZero(): boolean {
        return this.amount === 0;
    }

    /**
     * Check if this amount is positive
     */
    public isPositive(): boolean {
        return this.amount > 0;
    }

    /**
     * Format as string
     */
    public toString(): string {
        return `${this.amount.toFixed(2)} ${this.currency}`;
    }

    /**
     * Create money from string format "100.50 USD"
     */
    public static fromString(value: string): Money {
        const parts = value.trim().split(' ');
        if (parts.length !== 2) {
            throw new Error('Invalid money format. Expected "100.50 USD"');
        }

        const amount = parseFloat(parts[0]);
        if (isNaN(amount)) {
            throw new Error('Invalid amount format');
        }

        return new Money(amount, parts[1]);
    }

    /**
     * Create zero money in specified currency
     */
    public static zero(currency: string): Money {
        return new Money(0, currency);
    }
}