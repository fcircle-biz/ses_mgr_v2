package com.sesmanager.shared.domain.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * BusinessRuleViolationException（ビジネスルール違反例外）の単体テスト
 * TDD Red-Green-Refactor サイクルに従って実装
 */
@DisplayName("BusinessRuleViolationException ビジネスルール違反例外テスト")
class BusinessRuleViolationExceptionTest {

    @Nested
    @DisplayName("基本機能のテスト")
    class BasicFunctionalityTests {

        @Test
        @DisplayName("ビジネスルール違反例外を作成できる")
        void ビジネスルール違反例外を作成できる() {
            // Given
            String ruleName = "PROJECT_STATUS_TRANSITION";
            String message = "Invalid project status transition";
            String aggregateType = "Project";
            String aggregateId = "PROJECT-001";

            // When
            BusinessRuleViolationException exception = new BusinessRuleViolationException(
                ruleName, message, aggregateType, aggregateId);

            // Then
            assertThat(exception.getRuleName()).isEqualTo(ruleName);
            assertThat(exception.getAggregateType()).isEqualTo(aggregateType);
            assertThat(exception.getAggregateId()).isEqualTo(aggregateId);
            assertThat(exception.getErrorCode()).isEqualTo("BUSINESS_RULE_VIOLATION");
            assertThat(exception.getMessage()).isEqualTo(message);
            assertThat(exception.getUserMessage()).isEqualTo("業務ルールに違反しています: " + message);
        }

        @Test
        @DisplayName("SESBusinessExceptionを継承している")
        void SESBusinessExceptionを継承している() {
            // When
            BusinessRuleViolationException exception = new BusinessRuleViolationException(
                "RULE", "message", "Entity", "ID-001");

            // Then
            assertThat(exception).isInstanceOf(SESBusinessException.class);
            assertThat(exception).isInstanceOf(SESException.class);
        }

        @Test
        @DisplayName("コンテキスト情報が自動的に追加される")
        void コンテキスト情報が自動的に追加される() {
            // Given
            String ruleName = "ENGINEER_NOT_AVAILABLE";
            String aggregateType = "Engineer";
            String aggregateId = "ENG-001";

            // When
            BusinessRuleViolationException exception = new BusinessRuleViolationException(
                ruleName, "Engineer is not available", aggregateType, aggregateId);

            // Then
            Map<String, Object> context = exception.getContext();
            assertThat(context).containsEntry("ruleName", ruleName);
            assertThat(context).containsEntry("aggregateType", aggregateType);
            assertThat(context).containsEntry("aggregateId", aggregateId);
        }
    }

    @Nested
    @DisplayName("例外特性のテスト")
    class ExceptionCharacteristicsTests {

        @Test
        @DisplayName("重要度レベルはMEDIUM")
        void 重要度レベルはMEDIUM() {
            // When
            BusinessRuleViolationException exception = new BusinessRuleViolationException(
                "RULE", "message", "Entity", "ID");

            // Then
            assertThat(exception.getSeverityLevel()).isEqualTo(SESException.SeverityLevel.MEDIUM);
        }

        @Test
        @DisplayName("リトライ不可能")
        void リトライ不可能() {
            // When
            BusinessRuleViolationException exception = new BusinessRuleViolationException(
                "RULE", "message", "Entity", "ID");

            // Then
            assertThat(exception.isRetryable()).isFalse();
        }

        @Test
        @DisplayName("ユーザー表示可能")
        void ユーザー表示可能() {
            // When
            BusinessRuleViolationException exception = new BusinessRuleViolationException(
                "RULE", "message", "Entity", "ID");

            // Then
            assertThat(exception.isUserDisplayable()).isTrue();
        }
    }

    @Nested
    @DisplayName("ファクトリーメソッドのテスト")
    class FactoryMethodTests {

        @Test
        @DisplayName("プロジェクトステータス遷移エラーを作成できる")
        void プロジェクトステータス遷移エラーを作成できる() {
            // Given
            String projectId = "PROJECT-001";
            String currentStatus = "PLANNING";
            String targetStatus = "COMPLETED";

            // When
            BusinessRuleViolationException exception = 
                BusinessRuleViolationException.projectStatusTransition(projectId, currentStatus, targetStatus);

            // Then
            assertThat(exception.getRuleName()).isEqualTo("PROJECT_STATUS_TRANSITION");
            assertThat(exception.getAggregateType()).isEqualTo("Project");
            assertThat(exception.getAggregateId()).isEqualTo(projectId);
            assertThat(exception.getMessage()).contains(currentStatus, targetStatus);
            assertThat(exception.getUserMessage()).contains("プロジェクトの状態遷移が無効です");
        }

        @Test
        @DisplayName("技術者利用不可エラーを作成できる")
        void 技術者利用不可エラーを作成できる() {
            // Given
            String engineerId = "ENG-001";

            // When
            BusinessRuleViolationException exception = 
                BusinessRuleViolationException.engineerNotAvailable(engineerId);

            // Then
            assertThat(exception.getRuleName()).isEqualTo("ENGINEER_NOT_AVAILABLE");
            assertThat(exception.getAggregateType()).isEqualTo("Engineer");
            assertThat(exception.getAggregateId()).isEqualTo(engineerId);
            assertThat(exception.getMessage()).isEqualTo("技術者は現在稼働不可です");
            assertThat(exception.getUserMessage()).contains("技術者は現在稼働不可です");
        }

        @Test
        @DisplayName("契約署名済みエラーを作成できる")
        void 契約署名済みエラーを作成できる() {
            // Given
            String contractId = "CONTRACT-001";

            // When
            BusinessRuleViolationException exception = 
                BusinessRuleViolationException.contractAlreadySigned(contractId);

            // Then
            assertThat(exception.getRuleName()).isEqualTo("CONTRACT_ALREADY_SIGNED");
            assertThat(exception.getAggregateType()).isEqualTo("Contract");
            assertThat(exception.getAggregateId()).isEqualTo(contractId);
            assertThat(exception.getMessage()).isEqualTo("契約は既に署名済みです");
            assertThat(exception.getUserMessage()).contains("契約は既に署名済みです");
        }
    }
}