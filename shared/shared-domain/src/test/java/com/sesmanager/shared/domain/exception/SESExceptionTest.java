package com.sesmanager.shared.domain.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * SESException（基底例外）の単体テスト
 * TDD Red-Green-Refactor サイクルに従って実装
 */
@DisplayName("SESException 基底例外テスト")
class SESExceptionTest {

    @Nested
    @DisplayName("基本機能のテスト")
    class BasicFunctionalityTests {

        @Test
        @DisplayName("例外を作成できる")
        void 例外を作成できる() {
            // Given
            String errorCode = "TEST_ERROR";
            String message = "Test error occurred";
            String userMessage = "テストエラーが発生しました";
            Throwable cause = new RuntimeException("Original cause");

            // When
            TestableException exception = new TestableException(errorCode, message, userMessage, cause);

            // Then
            assertThat(exception.getErrorCode()).isEqualTo(errorCode);
            assertThat(exception.getMessage()).isEqualTo(message);
            assertThat(exception.getUserMessage()).isEqualTo(userMessage);
            assertThat(exception.getCause()).isEqualTo(cause);
        }

        @Test
        @DisplayName("タイムスタンプが自動設定される")
        void タイムスタンプが自動設定される() {
            // Given
            Instant beforeCreation = Instant.now();

            // When
            TestableException exception = new TestableException("TEST", "message", "ユーザーメッセージ", null);
            Instant afterCreation = Instant.now();

            // Then
            assertThat(exception.getTimestamp()).isNotNull();
            assertThat(exception.getTimestamp()).isAfterOrEqualTo(beforeCreation);
            assertThat(exception.getTimestamp()).isBeforeOrEqualTo(afterCreation);
        }

        @Test
        @DisplayName("相関IDが自動生成される")
        void 相関IDが自動生成される() {
            // When
            TestableException exception1 = new TestableException("TEST", "message1", "メッセージ1", null);
            TestableException exception2 = new TestableException("TEST", "message2", "メッセージ2", null);

            // Then
            assertThat(exception1.getCorrelationId()).isNotNull();
            assertThat(exception2.getCorrelationId()).isNotNull();
            assertThat(exception1.getCorrelationId()).isNotEqualTo(exception2.getCorrelationId());
            // UUID形式の検証
            assertThat(exception1.getCorrelationId()).matches(
                "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
            );
        }
    }

    @Nested
    @DisplayName("コンテキスト情報のテスト")
    class ContextTests {

        @Test
        @DisplayName("コンテキスト情報を追加できる")
        void コンテキスト情報を追加できる() {
            // Given
            TestableException exception = new TestableException("TEST", "message", "メッセージ", null);

            // When
            exception.addContext("userId", "USER123");
            exception.addContext("operationName", "createProject");
            exception.addContext("retryCount", 3);

            // Then
            Map<String, Object> context = exception.getContext();
            assertThat(context).containsEntry("userId", "USER123");
            assertThat(context).containsEntry("operationName", "createProject");
            assertThat(context).containsEntry("retryCount", 3);
        }

        @Test
        @DisplayName("チェーンメソッドでコンテキストを追加できる")
        void チェーンメソッドでコンテキストを追加できる() {
            // Given
            TestableException exception = new TestableException("TEST", "message", "メッセージ", null);

            // When
            SESException result = exception
                .addContext("key1", "value1")
                .addContext("key2", "value2")
                .addContext("key3", "value3");

            // Then
            assertThat(result).isSameAs(exception);
            Map<String, Object> context = exception.getContext();
            assertThat(context).hasSize(3);
            assertThat(context).containsKeys("key1", "key2", "key3");
        }

        @Test
        @DisplayName("getContextは防御的コピーを返す")
        void getContextは防御的コピーを返す() {
            // Given
            TestableException exception = new TestableException("TEST", "message", "メッセージ", null);
            exception.addContext("originalKey", "originalValue");

            // When
            Map<String, Object> context = exception.getContext();
            context.put("newKey", "newValue");
            context.remove("originalKey");

            // Then
            Map<String, Object> actualContext = exception.getContext();
            assertThat(actualContext).containsEntry("originalKey", "originalValue");
            assertThat(actualContext).doesNotContainKey("newKey");
        }
    }

    @Nested
    @DisplayName("ロギングコンテキストのテスト")
    class LoggingContextTests {

        @Test
        @DisplayName("ロギングコンテキストに必須情報が含まれる")
        void ロギングコンテキストに必須情報が含まれる() {
            // Given
            TestableException exception = new TestableException("TEST_ERROR", "message", "メッセージ", null);
            exception.addContext("customField", "customValue");

            // When
            Map<String, Object> loggingContext = exception.getLoggingContext();

            // Then
            assertThat(loggingContext).containsKey("errorCode");
            assertThat(loggingContext).containsKey("timestamp");
            assertThat(loggingContext).containsKey("correlationId");
            assertThat(loggingContext).containsEntry("customField", "customValue");
            assertThat(loggingContext.get("errorCode")).isEqualTo("TEST_ERROR");
        }

        @Test
        @DisplayName("ロギングコンテキストは防御的コピーを返す")
        void ロギングコンテキストは防御的コピーを返す() {
            // Given
            TestableException exception = new TestableException("TEST", "message", "メッセージ", null);

            // When
            Map<String, Object> loggingContext = exception.getLoggingContext();
            loggingContext.put("newKey", "newValue");

            // Then
            Map<String, Object> actualLoggingContext = exception.getLoggingContext();
            assertThat(actualLoggingContext).doesNotContainKey("newKey");
        }
    }

    @Nested
    @DisplayName("抽象メソッドのテスト")
    class AbstractMethodTests {

        @Test
        @DisplayName("重要度レベルを取得できる")
        void 重要度レベルを取得できる() {
            // Given
            TestableException lowException = new TestableException("TEST", "message", "メッセージ", null, 
                SESException.SeverityLevel.LOW, false, true);
            TestableException criticalException = new TestableException("TEST", "message", "メッセージ", null,
                SESException.SeverityLevel.CRITICAL, true, false);

            // Then
            assertThat(lowException.getSeverityLevel()).isEqualTo(SESException.SeverityLevel.LOW);
            assertThat(criticalException.getSeverityLevel()).isEqualTo(SESException.SeverityLevel.CRITICAL);
        }

        @Test
        @DisplayName("リトライ可能かどうかを判定できる")
        void リトライ可能かどうかを判定できる() {
            // Given
            TestableException retryableException = new TestableException("TEST", "message", "メッセージ", null,
                SESException.SeverityLevel.MEDIUM, true, true);
            TestableException nonRetryableException = new TestableException("TEST", "message", "メッセージ", null,
                SESException.SeverityLevel.MEDIUM, false, true);

            // Then
            assertThat(retryableException.isRetryable()).isTrue();
            assertThat(nonRetryableException.isRetryable()).isFalse();
        }

        @Test
        @DisplayName("ユーザー表示可能かどうかを判定できる")
        void ユーザー表示可能かどうかを判定できる() {
            // Given
            TestableException displayableException = new TestableException("TEST", "message", "メッセージ", null,
                SESException.SeverityLevel.LOW, false, true);
            TestableException nonDisplayableException = new TestableException("TEST", "message", "メッセージ", null,
                SESException.SeverityLevel.HIGH, false, false);

            // Then
            assertThat(displayableException.isUserDisplayable()).isTrue();
            assertThat(nonDisplayableException.isUserDisplayable()).isFalse();
        }
    }

    /**
     * テスト用の具象実装クラス
     */
    private static class TestableException extends SESException {
        private final SeverityLevel severityLevel;
        private final boolean retryable;
        private final boolean userDisplayable;

        public TestableException(String errorCode, String message, String userMessage, Throwable cause) {
            this(errorCode, message, userMessage, cause, SeverityLevel.MEDIUM, false, true);
        }

        public TestableException(String errorCode, String message, String userMessage, Throwable cause,
                               SeverityLevel severityLevel, boolean retryable, boolean userDisplayable) {
            super(errorCode, message, userMessage, cause);
            this.severityLevel = severityLevel;
            this.retryable = retryable;
            this.userDisplayable = userDisplayable;
        }

        @Override
        public SeverityLevel getSeverityLevel() {
            return severityLevel;
        }

        @Override
        public boolean isRetryable() {
            return retryable;
        }

        @Override
        public boolean isUserDisplayable() {
            return userDisplayable;
        }
    }
}