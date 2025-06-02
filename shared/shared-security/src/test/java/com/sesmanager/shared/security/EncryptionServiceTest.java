package com.sesmanager.shared.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import javax.crypto.SecretKey;
import java.util.Base64;

import static org.assertj.core.api.Assertions.*;

/**
 * EncryptionService の単体テスト
 * TDD Red-Green-Refactor サイクルに従って実装
 */
@DisplayName("EncryptionService テスト")
class EncryptionServiceTest {

    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptionService();
    }

    @Nested
    @DisplayName("キー生成のテスト")
    class KeyGenerationTests {

        @Test
        @DisplayName("AES-256暗号化キーを生成できる")
        void AES256暗号化キーを生成できる() {
            // When
            SecretKey key = encryptionService.generateKey();

            // Then
            assertThat(key).isNotNull();
            assertThat(key.getAlgorithm()).isEqualTo("AES");
            assertThat(key.getEncoded()).hasSize(32); // 256 bits = 32 bytes
        }

        @Test
        @DisplayName("生成されるキーは毎回異なる")
        void 生成されるキーは毎回異なる() {
            // When
            SecretKey key1 = encryptionService.generateKey();
            SecretKey key2 = encryptionService.generateKey();

            // Then
            assertThat(key1.getEncoded()).isNotEqualTo(key2.getEncoded());
        }

        @Test
        @DisplayName("生成されたキーは有効なAESキーである")
        void 生成されたキーは有効なAESキーである() {
            // When
            SecretKey key = encryptionService.generateKey();

            // Then
            assertThat(key.getFormat()).isEqualTo("RAW");
            assertThatNoException().isThrownBy(() -> {
                // キーを使用して暗号化テスト
                String testData = "test";
                encryptionService.encrypt(testData, key);
            });
        }
    }

    @Nested
    @DisplayName("キー変換のテスト")
    class KeyConversionTests {

        @Test
        @DisplayName("SecretKeyをBase64文字列に変換できる")
        void SecretKeyをBase64文字列に変換できる() {
            // Given
            SecretKey key = encryptionService.generateKey();

            // When
            String keyString = encryptionService.keyToString(key);

            // Then
            assertThat(keyString).isNotNull();
            assertThat(keyString).isNotEmpty();
            // Base64エンコード文字列の検証
            assertThatNoException().isThrownBy(() -> 
                Base64.getDecoder().decode(keyString));
        }

        @Test
        @DisplayName("Base64文字列からSecretKeyを復元できる")
        void Base64文字列からSecretKeyを復元できる() {
            // Given
            SecretKey originalKey = encryptionService.generateKey();
            String keyString = encryptionService.keyToString(originalKey);

            // When
            SecretKey restoredKey = encryptionService.keyFromString(keyString);

            // Then
            assertThat(restoredKey).isNotNull();
            assertThat(restoredKey.getAlgorithm()).isEqualTo("AES");
            assertThat(restoredKey.getEncoded()).isEqualTo(originalKey.getEncoded());
        }

        @Test
        @DisplayName("キー変換の往復で元のキーと同一になる")
        void キー変換の往復で元のキーと同一になる() {
            // Given
            SecretKey originalKey = encryptionService.generateKey();

            // When
            String keyString = encryptionService.keyToString(originalKey);
            SecretKey restoredKey = encryptionService.keyFromString(keyString);

            // Then
            assertThat(restoredKey.getEncoded()).isEqualTo(originalKey.getEncoded());
        }

        @Test
        @DisplayName("無効なBase64文字列でキー復元すると例外が発生する")
        void 無効なBase64文字列でキー復元すると例外が発生する() {
            // Given
            String invalidKeyString = "invalid-base64-string!!!";

            // When & Then
            assertThatThrownBy(() -> 
                encryptionService.keyFromString(invalidKeyString))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("暗号化・復号化のテスト")
    class EncryptionDecryptionTests {

        private SecretKey testKey;

        @BeforeEach
        void setUp() {
            testKey = encryptionService.generateKey();
        }

        @Test
        @DisplayName("文字列を暗号化・復号化できる")
        void 文字列を暗号化復号化できる() {
            // Given
            String plainText = "Hello, World!";

            // When
            String encrypted = encryptionService.encrypt(plainText, testKey);
            String decrypted = encryptionService.decrypt(encrypted, testKey);

            // Then
            assertThat(encrypted).isNotNull();
            assertThat(encrypted).isNotEqualTo(plainText);
            assertThat(decrypted).isEqualTo(plainText);
        }

        @Test
        @DisplayName("日本語文字列を暗号化・復号化できる")
        void 日本語文字列を暗号化復号化できる() {
            // Given
            String plainText = "こんにちは、世界！テスト文字列です。";

            // When
            String encrypted = encryptionService.encrypt(plainText, testKey);
            String decrypted = encryptionService.decrypt(encrypted, testKey);

            // Then
            assertThat(decrypted).isEqualTo(plainText);
        }

        @Test
        @DisplayName("長い文字列を暗号化・復号化できる")
        void 長い文字列を暗号化復号化できる() {
            // Given
            String plainText = "a".repeat(10000); // 10KB

            // When
            String encrypted = encryptionService.encrypt(plainText, testKey);
            String decrypted = encryptionService.decrypt(encrypted, testKey);

            // Then
            assertThat(decrypted).isEqualTo(plainText);
        }

        @Test
        @DisplayName("同じ平文を複数回暗号化すると異なる暗号文になる")
        void 同じ平文を複数回暗号化すると異なる暗号文になる() {
            // Given
            String plainText = "Same input text";

            // When
            String encrypted1 = encryptionService.encrypt(plainText, testKey);
            String encrypted2 = encryptionService.encrypt(plainText, testKey);

            // Then
            assertThat(encrypted1).isNotEqualTo(encrypted2);
            
            // 両方とも正しく復号化できる
            assertThat(encryptionService.decrypt(encrypted1, testKey)).isEqualTo(plainText);
            assertThat(encryptionService.decrypt(encrypted2, testKey)).isEqualTo(plainText);
        }

        @Test
        @DisplayName("暗号化結果はBase64エンコードされている")
        void 暗号化結果はBase64エンコードされている() {
            // Given
            String plainText = "Test data";

            // When
            String encrypted = encryptionService.encrypt(plainText, testKey);

            // Then
            assertThatNoException().isThrownBy(() -> 
                Base64.getDecoder().decode(encrypted));
        }

        @Test
        @DisplayName("異なるキーでは復号化できない")
        void 異なるキーでは復号化できない() {
            // Given
            String plainText = "Secret data";
            SecretKey anotherKey = encryptionService.generateKey();
            String encrypted = encryptionService.encrypt(plainText, testKey);

            // When & Then
            assertThatThrownBy(() -> 
                encryptionService.decrypt(encrypted, anotherKey))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Failed to decrypt data");
        }

        @Test
        @DisplayName("改ざんされた暗号文では復号化できない")
        void 改ざんされた暗号文では復号化できない() {
            // Given
            String plainText = "Important data";
            String encrypted = encryptionService.encrypt(plainText, testKey);
            
            // 暗号文を改ざん
            byte[] encryptedBytes = Base64.getDecoder().decode(encrypted);
            encryptedBytes[encryptedBytes.length - 1] ^= 1; // 最後のバイトを反転
            String tamperedEncrypted = Base64.getEncoder().encodeToString(encryptedBytes);

            // When & Then
            assertThatThrownBy(() -> 
                encryptionService.decrypt(tamperedEncrypted, testKey))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Failed to decrypt data");
        }

        @Test
        @DisplayName("無効な暗号文では復号化できない")
        void 無効な暗号文では復号化できない() {
            // Given
            String invalidEncrypted = "invalid-encrypted-data";

            // When & Then
            assertThatThrownBy(() -> 
                encryptionService.decrypt(invalidEncrypted, testKey))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Failed to decrypt data");
        }
    }

    @Nested
    @DisplayName("Null・空文字列処理のテスト")
    class NullEmptyStringTests {

        private SecretKey testKey;

        @BeforeEach
        void setUp() {
            testKey = encryptionService.generateKey();
        }

        @Test
        @DisplayName("null文字列の暗号化はnullを返す")
        void null文字列の暗号化はnullを返す() {
            // When
            String result = encryptionService.encrypt(null, testKey);

            // Then
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("空文字列の暗号化は空文字列を返す")
        void 空文字列の暗号化は空文字列を返す() {
            // When
            String result = encryptionService.encrypt("", testKey);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("null暗号文の復号化はnullを返す")
        void null暗号文の復号化はnullを返す() {
            // When
            String result = encryptionService.decrypt(null, testKey);

            // Then
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("空文字列暗号文の復号化は空文字列を返す")
        void 空文字列暗号文の復号化は空文字列を返す() {
            // When
            String result = encryptionService.decrypt("", testKey);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("nullキーで暗号化すると例外が発生する")
        void nullキーで暗号化すると例外が発生する() {
            // Given
            String plainText = "test data";

            // When & Then
            assertThatThrownBy(() -> 
                encryptionService.encrypt(plainText, null))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Failed to encrypt data");
        }

        @Test
        @DisplayName("nullキーで復号化すると例外が発生する")
        void nullキーで復号化すると例外が発生する() {
            // Given
            String encrypted = "some-encrypted-data";

            // When & Then
            assertThatThrownBy(() -> 
                encryptionService.decrypt(encrypted, null))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Failed to decrypt data");
        }
    }

    @Nested
    @DisplayName("データマスキングのテスト")
    class DataMaskingTests {

        @Test
        @DisplayName("4文字以下の文字列は常に***でマスキングされる")
        void 文字以下の文字列は常にアスタリスクでマスキングされる() {
            // Given & When & Then
            assertThat(encryptionService.maskForLogging("a")).isEqualTo("***");
            assertThat(encryptionService.maskForLogging("ab")).isEqualTo("***");
            assertThat(encryptionService.maskForLogging("abc")).isEqualTo("***");
            assertThat(encryptionService.maskForLogging("abcd")).isEqualTo("***");
        }

        @Test
        @DisplayName("5文字以上の文字列は最初と最後の2文字を表示してマスキングされる")
        void 文字以上の文字列は最初と最後の2文字を表示してマスキングされる() {
            // Given
            String sensitiveData = "sensitive123data";

            // When
            String masked = encryptionService.maskForLogging(sensitiveData);

            // Then
            assertThat(masked).isEqualTo("se***ta");
        }

        @Test
        @DisplayName("日本語文字列も正しくマスキングされる")
        void 日本語文字列も正しくマスキングされる() {
            // Given
            String sensitiveData = "機密情報テストデータ";

            // When
            String masked = encryptionService.maskForLogging(sensitiveData);

            // Then
            // "機密情報テストデータ" -> first 2: "機密", last 2: "ータ"
            assertThat(masked).isEqualTo("機密***ータ");
        }

        @Test
        @DisplayName("null文字列のマスキングは***を返す")
        void null文字列のマスキングはアスタリスクを返す() {
            // When
            String masked = encryptionService.maskForLogging(null);

            // Then
            assertThat(masked).isEqualTo("***");
        }

        @Test
        @DisplayName("空文字列のマスキングは***を返す")
        void 空文字列のマスキングはアスタリスクを返す() {
            // When
            String masked = encryptionService.maskForLogging("");

            // Then
            assertThat(masked).isEqualTo("***");
        }

        @Test
        @DisplayName("特殊文字を含む文字列も正しくマスキングされる")
        void 特殊文字を含む文字列も正しくマスキングされる() {
            // Given
            String sensitiveData = "user@example.com";

            // When
            String masked = encryptionService.maskForLogging(sensitiveData);

            // Then
            assertThat(masked).isEqualTo("us***om");
        }

        @Test
        @DisplayName("数字を含む文字列も正しくマスキングされる")
        void 数字を含む文字列も正しくマスキングされる() {
            // Given
            String sensitiveData = "password123456";

            // When
            String masked = encryptionService.maskForLogging(sensitiveData);

            // Then
            assertThat(masked).isEqualTo("pa***56");
        }
    }

    @Nested
    @DisplayName("セキュリティ検証のテスト")
    class SecurityValidationTests {

        @Test
        @DisplayName("暗号化にAES-256-GCMアルゴリズムが使用されている")
        void 暗号化にAES256GCMアルゴリズムが使用されている() {
            // Given
            SecretKey key = encryptionService.generateKey();
            String plainText = "test data";

            // When
            String encrypted = encryptionService.encrypt(plainText, key);

            // Then
            // 暗号化が成功し、GCMによる認証タグが含まれていることを間接的に検証
            assertThat(encrypted).isNotNull();
            assertThat(encrypted).isNotEqualTo(plainText);
            
            // 復号化が成功することでGCMの整合性検証をテスト
            String decrypted = encryptionService.decrypt(encrypted, key);
            assertThat(decrypted).isEqualTo(plainText);
        }

        @Test
        @DisplayName("IVが毎回異なることを確認")
        void IVが毎回異なることを確認() {
            // Given
            SecretKey key = encryptionService.generateKey();
            String plainText = "same text";

            // When
            String encrypted1 = encryptionService.encrypt(plainText, key);
            String encrypted2 = encryptionService.encrypt(plainText, key);

            // Then
            assertThat(encrypted1).isNotEqualTo(encrypted2);
            
            // 両方とも正常に復号化できる
            assertThat(encryptionService.decrypt(encrypted1, key)).isEqualTo(plainText);
            assertThat(encryptionService.decrypt(encrypted2, key)).isEqualTo(plainText);
        }

        @Test
        @DisplayName("暗号化されたデータには平文が含まれていない")
        void 暗号化されたデータには平文が含まれていない() {
            // Given
            String plainText = "VerySecretPassword123!";
            SecretKey key = encryptionService.generateKey();

            // When
            String encrypted = encryptionService.encrypt(plainText, key);

            // Then
            assertThat(encrypted).doesNotContain("VerySecret");
            assertThat(encrypted).doesNotContain("Password");
            assertThat(encrypted).doesNotContain("123");
        }

        @Test
        @DisplayName("暗号化結果の長さが適切である")
        void 暗号化結果の長さが適切である() {
            // Given
            String plainText = "test";
            SecretKey key = encryptionService.generateKey();

            // When
            String encrypted = encryptionService.encrypt(plainText, key);
            byte[] encryptedBytes = Base64.getDecoder().decode(encrypted);

            // Then
            // IV(12) + 暗号化データ(最小4) + GCMタグ(16) = 最小32バイト
            assertThat(encryptedBytes.length).isGreaterThanOrEqualTo(32);
            
            // IVは先頭12バイト
            assertThat(encryptedBytes.length).isGreaterThanOrEqualTo(12);
        }

        @Test
        @DisplayName("キーの強度が十分である")
        void キーの強度が十分である() {
            // Given & When
            SecretKey key = encryptionService.generateKey();
            byte[] keyBytes = key.getEncoded();

            // Then
            // AES-256キーは32バイト
            assertThat(keyBytes).hasSize(32);
            
            // キーが全て0でないことを確認
            boolean hasNonZero = false;
            for (byte b : keyBytes) {
                if (b != 0) {
                    hasNonZero = true;
                    break;
                }
            }
            assertThat(hasNonZero).isTrue();
        }
    }

    @Nested
    @DisplayName("パフォーマンステスト")
    class PerformanceTests {

        @Test
        @DisplayName("大量データの暗号化・復号化が合理的な時間で完了する")
        void 大量データの暗号化復号化が合理的な時間で完了する() {
            // Given
            SecretKey key = encryptionService.generateKey();
            String largeText = "x".repeat(100000); // 100KB

            // When
            long startTime = System.currentTimeMillis();
            String encrypted = encryptionService.encrypt(largeText, key);
            String decrypted = encryptionService.decrypt(encrypted, key);
            long endTime = System.currentTimeMillis();

            // Then
            assertThat(decrypted).isEqualTo(largeText);
            // 100KBの暗号化・復号化が5秒以内に完了する
            assertThat(endTime - startTime).isLessThan(5000);
        }

        @Test
        @DisplayName("複数回の暗号化操作が安定して実行される")
        void 複数回の暗号化操作が安定して実行される() {
            // Given
            SecretKey key = encryptionService.generateKey();
            String testData = "Performance test data";

            // When & Then
            for (int i = 0; i < 100; i++) {
                String encrypted = encryptionService.encrypt(testData, key);
                String decrypted = encryptionService.decrypt(encrypted, key);
                assertThat(decrypted).isEqualTo(testData);
            }
        }
    }
}