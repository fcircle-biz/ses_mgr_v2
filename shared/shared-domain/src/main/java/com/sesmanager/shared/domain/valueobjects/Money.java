package com.sesmanager.shared.domain.valueobjects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

/**
 * Value object representing monetary amounts with currency.
 * Used throughout the SES Manager system for billing, contracts, and financial calculations.
 */
@Embeddable
public class Money {

    @Column(name = "amount", precision = 19, scale = 4)
    @NotNull
    @PositiveOrZero
    private BigDecimal amount;

    @Column(name = "currency", length = 3)
    @NotNull
    private String currency;

    protected Money() {
        // For JPA
    }

    private Money(BigDecimal amount, Currency currency) {
        this.amount = amount.setScale(4, RoundingMode.HALF_UP);
        this.currency = currency.getCurrencyCode();
    }

    public static Money of(BigDecimal amount, Currency currency) {
        Objects.requireNonNull(amount, "Amount cannot be null");
        Objects.requireNonNull(currency, "Currency cannot be null");
        
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }
        
        return new Money(amount, currency);
    }

    public static Money ofJPY(BigDecimal amount) {
        return of(amount, Currency.getInstance("JPY"));
    }

    public static Money ofJPY(double amount) {
        return ofJPY(BigDecimal.valueOf(amount));
    }

    public static Money ofJPY(long amount) {
        return ofJPY(BigDecimal.valueOf(amount));
    }

    public static Money zero(Currency currency) {
        return of(BigDecimal.ZERO, currency);
    }

    public static Money zeroJPY() {
        return zero(Currency.getInstance("JPY"));
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public Currency getCurrencyInstance() {
        return Currency.getInstance(currency);
    }

    public Money add(Money other) {
        ensureSameCurrency(other);
        return new Money(this.amount.add(other.amount), getCurrencyInstance());
    }

    public Money subtract(Money other) {
        ensureSameCurrency(other);
        BigDecimal result = this.amount.subtract(other.amount);
        if (result.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Result cannot be negative");
        }
        return new Money(result, getCurrencyInstance());
    }

    public Money multiply(BigDecimal multiplier) {
        Objects.requireNonNull(multiplier, "Multiplier cannot be null");
        return new Money(this.amount.multiply(multiplier), getCurrencyInstance());
    }

    public Money multiply(double multiplier) {
        return multiply(BigDecimal.valueOf(multiplier));
    }

    public Money divide(BigDecimal divisor) {
        Objects.requireNonNull(divisor, "Divisor cannot be null");
        if (divisor.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Divisor cannot be zero");
        }
        return new Money(this.amount.divide(divisor, 4, RoundingMode.HALF_UP), getCurrencyInstance());
    }

    public boolean isZero() {
        return amount.compareTo(BigDecimal.ZERO) == 0;
    }

    public boolean isPositive() {
        return amount.compareTo(BigDecimal.ZERO) > 0;
    }

    public int compareTo(Money other) {
        ensureSameCurrency(other);
        return this.amount.compareTo(other.amount);
    }

    private void ensureSameCurrency(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                String.format("Currency mismatch: %s vs %s", this.currency, other.currency));
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Money money = (Money) o;
        return Objects.equals(amount, money.amount) && 
               Objects.equals(currency, money.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount, currency);
    }

    @Override
    public String toString() {
        return String.format("%s %s", amount, currency);
    }
}