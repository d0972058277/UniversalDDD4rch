package com.architecture.core.benchmarks;

import com.architecture.core.domain.ValueObject;

import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

import java.math.BigDecimal;
import java.util.Currency;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

/**
 * JMH benchmark for ValueObject operations performance.
 * Tests equality comparison and hashCode computation with different complexity levels.
 */
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
@Fork(2)
@Warmup(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 10, time = 1, timeUnit = TimeUnit.SECONDS)
public class ValueObjectBenchmark {

    private Money money1;
    private Money money2;
    private Money money3;
    private Address address1;
    private Address address2;
    private Address address3;

    @Setup
    public void setup() {
        money1 = new Money(new BigDecimal("100.50"), Currency.getInstance("USD"));
        money2 = new Money(new BigDecimal("100.50"), Currency.getInstance("USD"));
        money3 = new Money(new BigDecimal("200.00"), Currency.getInstance("EUR"));

        address1 = new Address("123 Main St", "Anytown", "12345", "US");
        address2 = new Address("123 Main St", "Anytown", "12345", "US");
        address3 = new Address("456 Oak Ave", "Other City", "67890", "CA");
    }

    @Benchmark
    public void benchmarkMoneyCreation(Blackhole bh) {
        Money money = new Money(new BigDecimal("50.00"), Currency.getInstance("USD"));
        bh.consume(money);
    }

    @Benchmark
    public void benchmarkMoneyEqualityTrue(Blackhole bh) {
        boolean equal = money1.equals(money2);
        bh.consume(equal);
    }

    @Benchmark
    public void benchmarkMoneyEqualityFalse(Blackhole bh) {
        boolean equal = money1.equals(money3);
        bh.consume(equal);
    }

    @Benchmark
    public void benchmarkMoneyHashCode(Blackhole bh) {
        int hash = money1.hashCode();
        bh.consume(hash);
    }

    @Benchmark
    public void benchmarkAddressCreation(Blackhole bh) {
        Address address = new Address("789 Pine St", "New City", "54321", "UK");
        bh.consume(address);
    }

    @Benchmark
    public void benchmarkAddressEqualityTrue(Blackhole bh) {
        boolean equal = address1.equals(address2);
        bh.consume(equal);
    }

    @Benchmark
    public void benchmarkAddressEqualityFalse(Blackhole bh) {
        boolean equal = address1.equals(address3);
        bh.consume(equal);
    }

    @Benchmark
    public void benchmarkAddressHashCode(Blackhole bh) {
        int hash = address1.hashCode();
        bh.consume(hash);
    }

    @Benchmark
    public void benchmarkMoneyToString(Blackhole bh) {
        String str = money1.toString();
        bh.consume(str);
    }

    @Benchmark
    public void benchmarkAddressToString(Blackhole bh) {
        String str = address1.toString();
        bh.consume(str);
    }

    /**
     * Simple value object with two fields for performance testing.
     */
    public static class Money extends ValueObject {
        private final BigDecimal amount;
        private final Currency currency;

        public Money(BigDecimal amount, Currency currency) {
            this.amount = Objects.requireNonNull(amount, "Amount cannot be null");
            this.currency = Objects.requireNonNull(currency, "Currency cannot be null");
        }

        public BigDecimal getAmount() { return amount; }
        public Currency getCurrency() { return currency; }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return List.of(amount, currency);
        }

        @Override
        public String toString() {
            return amount + " " + currency.getCurrencyCode();
        }
    }

    /**
     * More complex value object with four fields for performance testing.
     */
    public static class Address extends ValueObject {
        private final String street;
        private final String city;
        private final String postalCode;
        private final String country;

        public Address(String street, String city, String postalCode, String country) {
            this.street = Objects.requireNonNull(street, "Street cannot be null");
            this.city = Objects.requireNonNull(city, "City cannot be null");
            this.postalCode = Objects.requireNonNull(postalCode, "Postal code cannot be null");
            this.country = Objects.requireNonNull(country, "Country cannot be null");
        }

        public String getStreet() { return street; }
        public String getCity() { return city; }
        public String getPostalCode() { return postalCode; }
        public String getCountry() { return country; }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return List.of(street, city, postalCode, country);
        }

        @Override
        public String toString() {
            return street + ", " + city + " " + postalCode + ", " + country;
        }
    }
}