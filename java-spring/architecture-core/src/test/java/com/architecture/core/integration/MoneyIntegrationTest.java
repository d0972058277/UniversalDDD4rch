package com.architecture.core.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.architecture.core.domain.ValueObject;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for Money value object operations.
 * Tests T020: Money value object operations in integration scenarios.
 */
@DisplayName("Money Integration Tests")
class MoneyIntegrationTest {

    /**
     * Test Money implementation for the quickstart example
     */
    static class Money extends ValueObject {
        private final BigDecimal amount;
        private final Currency currency;

        public Money(BigDecimal amount, Currency currency) {
            this.amount = java.util.Objects.requireNonNull(amount, "Amount cannot be null");
            this.currency = java.util.Objects.requireNonNull(currency, "Currency cannot be null");

            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Amount cannot be negative");
            }
        }

        public BigDecimal getAmount() { return amount; }
        public Currency getCurrency() { return currency; }

        public Money add(Money other) {
            if (!this.currency.equals(other.currency)) {
                throw new IllegalArgumentException("Cannot add money with different currencies");
            }
            return new Money(this.amount.add(other.amount), this.currency);
        }

        public Money multiply(BigDecimal factor) {
            if (factor.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Factor cannot be negative");
            }
            return new Money(this.amount.multiply(factor).setScale(2, RoundingMode.HALF_UP), this.currency);
        }

        public Money subtract(Money other) {
            if (!this.currency.equals(other.currency)) {
                throw new IllegalArgumentException("Cannot subtract money with different currencies");
            }
            BigDecimal result = this.amount.subtract(other.amount);
            if (result.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Subtraction result cannot be negative");
            }
            return new Money(result, this.currency);
        }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return List.of(amount, currency);
        }

        // Factory methods
        public static Money usd(double amount) {
            return new Money(BigDecimal.valueOf(amount).setScale(2, RoundingMode.HALF_UP), Currency.getInstance("USD"));
        }

        public static Money eur(double amount) {
            return new Money(BigDecimal.valueOf(amount).setScale(2, RoundingMode.HALF_UP), Currency.getInstance("EUR"));
        }

        public static Money zero(Currency currency) {
            return new Money(BigDecimal.ZERO, currency);
        }
    }

    @Test
    @DisplayName("Should_CreateMoneySuccessfully_When_ValidAmountAndCurrencyProvided")
    void Should_CreateMoneySuccessfully_When_ValidAmountAndCurrencyProvided() {
        // Given
        BigDecimal amount = new BigDecimal("100.50");
        Currency currency = Currency.getInstance("USD");

        // When
        Money money = new Money(amount, currency);

        // Then
        assertThat(money.getAmount()).isEqualTo(amount);
        assertThat(money.getCurrency()).isEqualTo(currency);
    }

    @Test
    @DisplayName("Should_ThrowException_When_AmountIsNegative")
    void Should_ThrowException_When_AmountIsNegative() {
        // Given
        BigDecimal negativeAmount = new BigDecimal("-10.00");
        Currency currency = Currency.getInstance("USD");

        // When & Then
        assertThatThrownBy(() -> new Money(negativeAmount, currency))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Amount cannot be negative");
    }

    @Test
    @DisplayName("Should_ThrowException_When_AmountIsNull")
    void Should_ThrowException_When_AmountIsNull() {
        // Given
        Currency currency = Currency.getInstance("USD");

        // When & Then
        assertThatThrownBy(() -> new Money(null, currency))
            .isInstanceOf(NullPointerException.class)
            .hasMessage("Amount cannot be null");
    }

    @Test
    @DisplayName("Should_ThrowException_When_CurrencyIsNull")
    void Should_ThrowException_When_CurrencyIsNull() {
        // Given
        BigDecimal amount = new BigDecimal("100.00");

        // When & Then
        assertThatThrownBy(() -> new Money(amount, null))
            .isInstanceOf(NullPointerException.class)
            .hasMessage("Currency cannot be null");
    }

    @ParameterizedTest(name = "{0} + {1} = {2}")
    @MethodSource("additionTestCases")
    @DisplayName("Should_AddMoneyCorrectly_When_SameCurrency")
    void Should_AddMoneyCorrectly_When_SameCurrency(
        String amount1, String amount2, String expectedResult) {
        // Given
        Money money1 = new Money(new BigDecimal(amount1), Currency.getInstance("USD"));
        Money money2 = new Money(new BigDecimal(amount2), Currency.getInstance("USD"));

        // When
        Money result = money1.add(money2);

        // Then
        assertThat(result.getAmount()).isEqualTo(new BigDecimal(expectedResult));
        assertThat(result.getCurrency()).isEqualTo(Currency.getInstance("USD"));
    }

    private static Stream<Arguments> additionTestCases() {
        return Stream.of(
            Arguments.of("100.50", "50.25", "150.75"),
            Arguments.of("0.00", "100.00", "100.00"),
            Arguments.of("999.99", "0.01", "1000.00"),
            Arguments.of("10.123", "20.456", "30.579")
        );
    }

    @Test
    @DisplayName("Should_ThrowException_When_AddingDifferentCurrencies")
    void Should_ThrowException_When_AddingDifferentCurrencies() {
        // Given
        Money usdMoney = Money.usd(100.00);
        Money eurMoney = Money.eur(100.00);

        // When & Then
        assertThatThrownBy(() -> usdMoney.add(eurMoney))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Cannot add money with different currencies");
    }

    @ParameterizedTest(name = "{0} * {1} = {2}")
    @MethodSource("multiplicationTestCases")
    @DisplayName("Should_MultiplyMoneyCorrectly_When_ValidFactor")
    void Should_MultiplyMoneyCorrectly_When_ValidFactor(
        String amount, String factor, String expectedResult) {
        // Given
        Money money = new Money(new BigDecimal(amount), Currency.getInstance("USD"));
        BigDecimal multiplier = new BigDecimal(factor);

        // When
        Money result = money.multiply(multiplier);

        // Then
        assertThat(result.getAmount()).isEqualTo(new BigDecimal(expectedResult));
        assertThat(result.getCurrency()).isEqualTo(Currency.getInstance("USD"));
    }

    private static Stream<Arguments> multiplicationTestCases() {
        return Stream.of(
            Arguments.of("100.00", "2", "200.00"),
            Arguments.of("50.50", "0", "0.00"),
            Arguments.of("33.33", "3", "99.99"),
            Arguments.of("100.00", "1.5", "150.00")
        );
    }

    @Test
    @DisplayName("Should_ThrowException_When_MultiplyingByNegativeFactor")
    void Should_ThrowException_When_MultiplyingByNegativeFactor() {
        // Given
        Money money = Money.usd(100.00);
        BigDecimal negativeFactor = new BigDecimal("-2");

        // When & Then
        assertThatThrownBy(() -> money.multiply(negativeFactor))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Factor cannot be negative");
    }

    @Test
    @DisplayName("Should_SubtractMoneyCorrectly_When_SameCurrencyAndResultIsNonNegative")
    void Should_SubtractMoneyCorrectly_When_SameCurrencyAndResultIsNonNegative() {
        // Given
        Money money1 = Money.usd(100.00);
        Money money2 = Money.usd(30.00);

        // When
        Money result = money1.subtract(money2);

        // Then
        assertThat(result.getAmount()).isEqualTo(new BigDecimal("70.00"));
        assertThat(result.getCurrency()).isEqualTo(Currency.getInstance("USD"));
    }

    @Test
    @DisplayName("Should_ThrowException_When_SubtractionResultIsNegative")
    void Should_ThrowException_When_SubtractionResultIsNegative() {
        // Given
        Money smallerAmount = Money.usd(30.00);
        Money largerAmount = Money.usd(100.00);

        // When & Then
        assertThatThrownBy(() -> smallerAmount.subtract(largerAmount))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Subtraction result cannot be negative");
    }

    @Test
    @DisplayName("Should_ThrowException_When_SubtractingDifferentCurrencies")
    void Should_ThrowException_When_SubtractingDifferentCurrencies() {
        // Given
        Money usdMoney = Money.usd(100.00);
        Money eurMoney = Money.eur(50.00);

        // When & Then
        assertThatThrownBy(() -> usdMoney.subtract(eurMoney))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Cannot subtract money with different currencies");
    }

    @Test
    @DisplayName("Should_HaveStructuralEquality_When_ComparingMoneyObjects")
    void Should_HaveStructuralEquality_When_ComparingMoneyObjects() {
        // Given
        Money money1 = Money.usd(100.50);
        Money money2 = Money.usd(100.50);
        Money money3 = Money.eur(100.50);
        Money money4 = Money.usd(200.00);

        // When & Then - Equal money objects
        assertThat(money1.equals(money2)).isTrue();
        assertThat(money1.hashCode()).isEqualTo(money2.hashCode());

        // Different currencies
        assertThat(money1.equals(money3)).isFalse();

        // Different amounts
        assertThat(money1.equals(money4)).isFalse();

        // Null and other type comparisons
        assertThat(money1.equals(null)).isFalse();
        assertThat(money1.equals("100.50 USD")).isFalse();
    }

    @Test
    @DisplayName("Should_CreateZeroMoney_When_UsingZeroFactory")
    void Should_CreateZeroMoney_When_UsingZeroFactory() {
        // Given
        Currency usd = Currency.getInstance("USD");

        // When
        Money zeroMoney = Money.zero(usd);

        // Then
        assertThat(zeroMoney.getAmount()).isEqualTo(BigDecimal.ZERO);
        assertThat(zeroMoney.getCurrency()).isEqualTo(usd);
    }

    @Test
    @DisplayName("Should_CreateFactoryMethods_When_UsingCurrencySpecificFactories")
    void Should_CreateFactoryMethods_When_UsingCurrencySpecificFactories() {
        // Given & When
        Money usdMoney = Money.usd(100.50);
        Money eurMoney = Money.eur(200.75);

        // Then
        assertThat(usdMoney.getAmount()).isEqualTo(new BigDecimal("100.50"));
        assertThat(usdMoney.getCurrency()).isEqualTo(Currency.getInstance("USD"));

        assertThat(eurMoney.getAmount()).isEqualTo(new BigDecimal("200.75"));
        assertThat(eurMoney.getCurrency()).isEqualTo(Currency.getInstance("EUR"));
    }

    @Test
    @DisplayName("Should_HandleComplexCalculations_When_ChaininingOperations")
    void Should_HandleComplexCalculations_When_ChaininingOperations() {
        // Given
        Money baseAmount = Money.usd(100.00);
        Money taxAmount = Money.usd(15.00);
        Money discountAmount = Money.usd(10.00);

        // When - Calculate final price: (base + tax - discount) * 1.05 (service fee)
        Money subtotal = baseAmount.add(taxAmount);
        Money afterDiscount = subtotal.subtract(discountAmount);
        Money finalAmount = afterDiscount.multiply(new BigDecimal("1.05"));

        // Then
        assertThat(finalAmount.getAmount()).isEqualTo(new BigDecimal("110.25"));
        assertThat(finalAmount.getCurrency()).isEqualTo(Currency.getInstance("USD"));
    }

    @Test
    @DisplayName("Should_MaintainPrecision_When_UsingBigDecimalOperations")
    void Should_MaintainPrecision_When_UsingBigDecimalOperations() {
        // Given
        Money money1 = new Money(new BigDecimal("10.123456"), Currency.getInstance("USD"));
        Money money2 = new Money(new BigDecimal("20.654321"), Currency.getInstance("USD"));

        // When
        Money result = money1.add(money2);

        // Then
        assertThat(result.getAmount()).isEqualTo(new BigDecimal("30.777777"));
        assertThat(result.getAmount().scale()).isEqualTo(6); // Precision maintained
    }
}