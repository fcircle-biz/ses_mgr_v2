package com.sesmanager.shared.domain.valueobject;

import com.sesmanager.shared.domain.valueobjects.Money;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.Currency;

import static org.assertj.core.api.Assertions.*;

/**
 * Money Value Object の単体テスト
 * TDD Red-Green-Refactor サイクルに従って実装
 */
@DisplayName("Money Value Object テスト")
class MoneyTest {

    private static final Currency JPY = Currency.getInstance("JPY");
    private static final Currency USD = Currency.getInstance("USD");

    @Nested
    @DisplayName("ファクトリメソッドのテスト")
    class FactoryMethodTests {

        @Test
        @DisplayName("正の金額とJPY通貨でMoneyオブジェクトを作成できる")
        void 正の金額とJPY通貨でMoneyオブジェクトを作成できる() {
            // Given
            BigDecimal amount = new BigDecimal("1000");
            
            // When
            Money money = Money.of(amount, JPY);
            
            // Then
            assertThat(money).isNotNull();
            assertThat(money.getAmount()).isEqualByComparingTo(new BigDecimal("1000.0000"));
            assertThat(money.getCurrency()).isEqualTo("JPY");
        }

        @Test
        @DisplayName("ゼロの金額でMoneyオブジェクトを作成できる")
        void ゼロの金額でMoneyオブジェクトを作成できる() {
            // When
            Money money = Money.of(BigDecimal.ZERO, JPY);
            
            // Then
            assertThat(money.isZero()).isTrue();
            assertThat(money.isPositive()).isFalse();
        }

        @Test
        @DisplayName("負の金額で作成しようとすると例外がスローされる")
        void 負の金額で作成しようとすると例外がスローされる() {
            // Given
            BigDecimal negativeAmount = new BigDecimal("-100");
            
            // When & Then
            assertThatThrownBy(() -> Money.of(negativeAmount, JPY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Amount cannot be negative");
        }

        @Test
        @DisplayName("nullの金額で作成しようとすると例外がスローされる")
        void nullの金額で作成しようとすると例外がスローされる() {
            // When & Then
            assertThatThrownBy(() -> Money.of(null, JPY))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("Amount cannot be null");
        }

        @Test
        @DisplayName("nullの通貨で作成しようとすると例外がスローされる")
        void nullの通貨で作成しようとすると例外がスローされる() {
            // Given
            BigDecimal amount = new BigDecimal("1000");
            
            // When & Then
            assertThatThrownBy(() -> Money.of(amount, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("Currency cannot be null");
        }
    }

    @Nested
    @DisplayName("JPY専用ファクトリメソッドのテスト")
    class JPYFactoryMethodTests {

        @Test
        @DisplayName("BigDecimalでJPYのMoneyオブジェクトを作成できる")
        void BigDecimalでJPYのMoneyオブジェクトを作成できる() {
            // Given
            BigDecimal amount = new BigDecimal("1000");
            
            // When
            Money money = Money.ofJPY(amount);
            
            // Then
            assertThat(money.getCurrency()).isEqualTo("JPY");
            assertThat(money.getAmount()).isEqualByComparingTo(new BigDecimal("1000.0000"));
        }

        @Test
        @DisplayName("doubleでJPYのMoneyオブジェクトを作成できる")
        void doubleでJPYのMoneyオブジェクトを作成できる() {
            // When
            Money money = Money.ofJPY(1000.50);
            
            // Then
            assertThat(money.getCurrency()).isEqualTo("JPY");
            assertThat(money.getAmount()).isEqualByComparingTo(new BigDecimal("1000.5000"));
        }

        @Test
        @DisplayName("longでJPYのMoneyオブジェクトを作成できる")
        void longでJPYのMoneyオブジェクトを作成できる() {
            // When
            Money money = Money.ofJPY(1000L);
            
            // Then
            assertThat(money.getCurrency()).isEqualTo("JPY");
            assertThat(money.getAmount()).isEqualByComparingTo(new BigDecimal("1000.0000"));
        }

        @Test
        @DisplayName("ゼロのJPYのMoneyオブジェクトを作成できる")
        void ゼロのJPYのMoneyオブジェクトを作成できる() {
            // When
            Money money = Money.zeroJPY();
            
            // Then
            assertThat(money.getCurrency()).isEqualTo("JPY");
            assertThat(money.isZero()).isTrue();
        }
    }

    @Nested
    @DisplayName("算術演算のテスト")
    class ArithmeticOperationTests {

        @Test
        @DisplayName("同じ通貨のMoney同士を加算できる")
        void 同じ通貨のMoney同士を加算できる() {
            // Given
            Money money1 = Money.ofJPY(1000);
            Money money2 = Money.ofJPY(500);
            
            // When
            Money result = money1.add(money2);
            
            // Then
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("1500.0000"));
            assertThat(result.getCurrency()).isEqualTo("JPY");
        }

        @Test
        @DisplayName("異なる通貨のMoney同士を加算しようとすると例外がスローされる")
        void 異なる通貨のMoney同士を加算しようとすると例外がスローされる() {
            // Given
            Money jpyMoney = Money.ofJPY(1000);
            Money usdMoney = Money.of(new BigDecimal("10"), USD);
            
            // When & Then
            assertThatThrownBy(() -> jpyMoney.add(usdMoney))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Currency mismatch: JPY vs USD");
        }

        @Test
        @DisplayName("同じ通貨のMoney同士を減算できる")
        void 同じ通貨のMoney同士を減算できる() {
            // Given
            Money money1 = Money.ofJPY(1000);
            Money money2 = Money.ofJPY(300);
            
            // When
            Money result = money1.subtract(money2);
            
            // Then
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("700.0000"));
            assertThat(result.getCurrency()).isEqualTo("JPY");
        }

        @Test
        @DisplayName("減算結果が負になる場合は例外がスローされる")
        void 減算結果が負になる場合は例外がスローされる() {
            // Given
            Money money1 = Money.ofJPY(100);
            Money money2 = Money.ofJPY(200);
            
            // When & Then
            assertThatThrownBy(() -> money1.subtract(money2))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Result cannot be negative");
        }

        @Test
        @DisplayName("BigDecimalで乗算できる")
        void BigDecimalで乗算できる() {
            // Given
            Money money = Money.ofJPY(1000);
            BigDecimal multiplier = new BigDecimal("1.5");
            
            // When
            Money result = money.multiply(multiplier);
            
            // Then
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("1500.0000"));
        }

        @Test
        @DisplayName("doubleで乗算できる")
        void doubleで乗算できる() {
            // Given
            Money money = Money.ofJPY(1000);
            
            // When
            Money result = money.multiply(1.5);
            
            // Then
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("1500.0000"));
        }

        @Test
        @DisplayName("BigDecimalで除算できる")
        void BigDecimalで除算できる() {
            // Given
            Money money = Money.ofJPY(1000);
            BigDecimal divisor = new BigDecimal("4");
            
            // When
            Money result = money.divide(divisor);
            
            // Then
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("250.0000"));
        }

        @Test
        @DisplayName("ゼロで除算しようとすると例外がスローされる")
        void ゼロで除算しようとすると例外がスローされる() {
            // Given
            Money money = Money.ofJPY(1000);
            
            // When & Then
            assertThatThrownBy(() -> money.divide(BigDecimal.ZERO))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Divisor cannot be zero");
        }
    }

    @Nested
    @DisplayName("比較メソッドのテスト")
    class ComparisonTests {

        @Test
        @DisplayName("同じ金額と通貨のMoneyは等しい")
        void 同じ金額と通貨のMoneyは等しい() {
            // Given
            Money money1 = Money.ofJPY(1000);
            Money money2 = Money.ofJPY(1000);
            
            // When & Then
            assertThat(money1).isEqualTo(money2);
            assertThat(money1.hashCode()).isEqualTo(money2.hashCode());
        }

        @Test
        @DisplayName("異なる金額のMoneyは等しくない")
        void 異なる金額のMoneyは等しくない() {
            // Given
            Money money1 = Money.ofJPY(1000);
            Money money2 = Money.ofJPY(2000);
            
            // When & Then
            assertThat(money1).isNotEqualTo(money2);
        }

        @Test
        @DisplayName("異なる通貨のMoneyは等しくない")
        void 異なる通貨のMoneyは等しくない() {
            // Given
            Money money1 = Money.ofJPY(1000);
            Money money2 = Money.of(new BigDecimal("1000"), USD);
            
            // When & Then
            assertThat(money1).isNotEqualTo(money2);
        }

        @Test
        @DisplayName("同じ通貨のMoney同士を比較できる")
        void 同じ通貨のMoney同士を比較できる() {
            // Given
            Money money1 = Money.ofJPY(1000);
            Money money2 = Money.ofJPY(2000);
            Money money3 = Money.ofJPY(1000);
            
            // When & Then
            assertThat(money1.compareTo(money2)).isLessThan(0);
            assertThat(money2.compareTo(money1)).isGreaterThan(0);
            assertThat(money1.compareTo(money3)).isEqualTo(0);
        }

        @Test
        @DisplayName("異なる通貨のMoney同士を比較しようとすると例外がスローされる")
        void 異なる通貨のMoney同士を比較しようとすると例外がスローされる() {
            // Given
            Money jpyMoney = Money.ofJPY(1000);
            Money usdMoney = Money.of(new BigDecimal("10"), USD);
            
            // When & Then
            assertThatThrownBy(() -> jpyMoney.compareTo(usdMoney))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Currency mismatch: JPY vs USD");
        }
    }

    @Nested
    @DisplayName("状態チェックメソッドのテスト")
    class StateCheckTests {

        @Test
        @DisplayName("ゼロの金額はisZeroがtrueを返す")
        void ゼロの金額はisZeroがtrueを返す() {
            // Given
            Money money = Money.zeroJPY();
            
            // When & Then
            assertThat(money.isZero()).isTrue();
            assertThat(money.isPositive()).isFalse();
        }

        @Test
        @DisplayName("正の金額はisPositiveがtrueを返す")
        void 正の金額はisPositiveがtrueを返す() {
            // Given
            Money money = Money.ofJPY(1000);
            
            // When & Then
            assertThat(money.isPositive()).isTrue();
            assertThat(money.isZero()).isFalse();
        }
    }

    @Nested
    @DisplayName("文字列表現のテスト")
    class StringRepresentationTests {

        @Test
        @DisplayName("toStringは金額と通貨を表示する")
        void toStringは金額と通貨を表示する() {
            // Given
            Money money = Money.ofJPY(1000);
            
            // When
            String str = money.toString();
            
            // Then
            assertThat(str).isEqualTo("1000.0000 JPY");
        }
    }

    @Nested
    @DisplayName("JPA統合のテスト")
    class JPAIntegrationTests {

        @Test
        @DisplayName("通貨インスタンスを取得できる")
        void 通貨インスタンスを取得できる() {
            // Given
            Money money = Money.ofJPY(1000);
            
            // When
            Currency currency = money.getCurrencyInstance();
            
            // Then
            assertThat(currency).isEqualTo(JPY);
            assertThat(currency.getCurrencyCode()).isEqualTo("JPY");
        }
    }
}