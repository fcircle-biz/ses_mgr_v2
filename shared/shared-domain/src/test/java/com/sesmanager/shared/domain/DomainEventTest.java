package com.sesmanager.shared.domain;

import com.sesmanager.shared.domain.event.EngineerStatusChangedEvent;
import com.sesmanager.shared.domain.event.ProjectCreatedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * DomainEvent基底クラスの単体テスト
 * TDD Red-Green-Refactor サイクルに従って実装
 */
@DisplayName("DomainEvent 基底クラステスト")
class DomainEventTest {

    @Nested
    @DisplayName("基本機能のテスト")
    class BasicFunctionalityTests {

        @Test
        @DisplayName("ドメインイベントを作成できる")
        void ドメインイベントを作成できる() {
            // Given
            String aggregateId = "AGG-001";
            String aggregateType = "Project";

            // When
            TestDomainEvent event = new TestDomainEvent(aggregateId, aggregateType);

            // Then
            assertThat(event.getEventId()).isNotNull();
            assertThat(event.getAggregateId()).isEqualTo(aggregateId);
            assertThat(event.getAggregateType()).isEqualTo(aggregateType);
            assertThat(event.getOccurredOn()).isNotNull();
            assertThat(event.getVersion()).isEqualTo(1L);
            assertThat(event.getEventType()).isEqualTo("TestEvent");
        }

        @Test
        @DisplayName("バージョンを指定してドメインイベントを作成できる")
        void バージョンを指定してドメインイベントを作成できる() {
            // Given
            String aggregateId = "AGG-001";
            String aggregateType = "Project";
            Long version = 5L;

            // When
            TestDomainEvent event = new TestDomainEvent(aggregateId, aggregateType, version);

            // Then
            assertThat(event.getVersion()).isEqualTo(version);
        }

        @Test
        @DisplayName("イベントIDは一意である")
        void イベントIDは一意である() {
            // When
            TestDomainEvent event1 = new TestDomainEvent("AGG-001", "Project");
            TestDomainEvent event2 = new TestDomainEvent("AGG-001", "Project");

            // Then
            assertThat(event1.getEventId()).isNotEqualTo(event2.getEventId());
        }

        @Test
        @DisplayName("発生時刻が自動設定される")
        void 発生時刻が自動設定される() {
            // Given
            Instant beforeCreation = Instant.now();

            // When
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Project");
            Instant afterCreation = Instant.now();

            // Then
            assertThat(event.getOccurredOn()).isNotNull();
            assertThat(event.getOccurredOn()).isAfterOrEqualTo(beforeCreation);
            assertThat(event.getOccurredOn()).isBeforeOrEqualTo(afterCreation);
        }
    }

    @Nested
    @DisplayName("文字列表現のテスト")
    class StringRepresentationTests {

        @Test
        @DisplayName("toStringは必要な情報を含む")
        void toStringは必要な情報を含む() {
            // Given
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Project", 3L);

            // When
            String toString = event.toString();

            // Then
            assertThat(toString).contains("TestDomainEvent");
            assertThat(toString).contains(event.getEventId().toString());
            assertThat(toString).contains("AGG-001");
            assertThat(toString).contains("Project");
            assertThat(toString).contains("version=3");
        }
    }

    @Nested
    @DisplayName("具体的なドメインイベントのテスト")
    class ConcreteEventTests {

        @Test
        @DisplayName("ProjectCreatedEventを作成できる")
        void ProjectCreatedEventを作成できる() {
            // Given
            String projectId = "PROJECT-001";
            String projectName = "新規プロジェクト";
            String description = "新規プロジェクトの説明";
            String clientCompany = "テスト株式会社";
            String status = "DRAFT";

            // When
            ProjectCreatedEvent event = new ProjectCreatedEvent(projectId, projectName, description, clientCompany, status);

            // Then
            assertThat(event.getAggregateId()).isEqualTo(projectId);
            assertThat(event.getAggregateType()).isEqualTo("Project");
            assertThat(event.getEventType()).isEqualTo("ProjectCreated");
            assertThat(event.getProjectName()).isEqualTo(projectName);
            assertThat(event.getDescription()).isEqualTo(description);
            assertThat(event.getClientCompany()).isEqualTo(clientCompany);
            assertThat(event.getStatus()).isEqualTo(status);
        }

        @Test
        @DisplayName("EngineerStatusChangedEventを作成できる")
        void EngineerStatusChangedEventを作成できる() {
            // Given
            String engineerId = "ENG-001";
            String oldStatus = "AVAILABLE";
            String newStatus = "ASSIGNED";

            // When
            EngineerStatusChangedEvent event = new EngineerStatusChangedEvent(engineerId, oldStatus, newStatus);

            // Then
            assertThat(event.getAggregateId()).isEqualTo(engineerId);
            assertThat(event.getAggregateType()).isEqualTo("Engineer");
            assertThat(event.getEventType()).isEqualTo("EngineerStatusChanged");
            assertThat(event.getOldStatus()).isEqualTo(oldStatus);
            assertThat(event.getNewStatus()).isEqualTo(newStatus);
        }
    }

    /**
     * テスト用のドメインイベント実装
     */
    private static class TestDomainEvent extends DomainEvent {
        public TestDomainEvent(String aggregateId, String aggregateType) {
            super(aggregateId, aggregateType);
        }

        public TestDomainEvent(String aggregateId, String aggregateType, Long version) {
            super(aggregateId, aggregateType, version);
        }

        @Override
        public String getEventType() {
            return "TestEvent";
        }
    }

}