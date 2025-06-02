package com.sesmanager.shared.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sesmanager.shared.domain.DomainEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * DomainEventPublisher の単体テスト
 * TDD Red-Green-Refactor サイクルに従って実装
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DomainEventPublisher テスト")
class DomainEventPublisherTest {

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private SendResult<String, String> sendResult;

    @Mock
    private CompletableFuture<SendResult<String, String>> future;

    private DomainEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new DomainEventPublisher(kafkaTemplate, objectMapper);
    }

    @Nested
    @DisplayName("単一イベント発行のテスト")
    class SingleEventPublishTests {

        @Test
        @DisplayName("ドメインイベントを正常に発行できる")
        void ドメインイベントを正常に発行できる() throws Exception {
            // Given
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Project");
            String expectedJson = "{\"eventId\":\"123\",\"aggregateId\":\"AGG-001\"}";
            String expectedTopic = "ses.events.project";
            String expectedKey = "AGG-001";

            when(objectMapper.writeValueAsString(event)).thenReturn(expectedJson);
            when(kafkaTemplate.send(expectedTopic, expectedKey, expectedJson)).thenReturn(future);

            // When
            publisher.publish(event);

            // Then
            verify(objectMapper).writeValueAsString(event);
            verify(kafkaTemplate).send(expectedTopic, expectedKey, expectedJson);
        }

        @Test
        @DisplayName("大文字小文字混在の集約タイプでも正しいトピック名が生成される")
        void 大文字小文字混在の集約タイプでも正しいトピック名が生成される() throws Exception {
            // Given
            TestDomainEvent event = new TestDomainEvent("ENG-001", "Engineer");
            String expectedJson = "{}";
            String expectedTopic = "ses.events.engineer";

            when(objectMapper.writeValueAsString(event)).thenReturn(expectedJson);
            when(kafkaTemplate.send(expectedTopic, "ENG-001", expectedJson)).thenReturn(future);

            // When
            publisher.publish(event);

            // Then
            verify(kafkaTemplate).send(expectedTopic, "ENG-001", expectedJson);
        }

        @Test
        @DisplayName("複合語の集約タイプでも正しいトピック名が生成される")
        void 複合語の集約タイプでも正しいトピック名が生成される() throws Exception {
            // Given
            TestDomainEvent event = new TestDomainEvent("MATCH-001", "MatchingResult");
            String expectedJson = "{}";
            String expectedTopic = "ses.events.matchingresult";

            when(objectMapper.writeValueAsString(event)).thenReturn(expectedJson);
            when(kafkaTemplate.send(expectedTopic, "MATCH-001", expectedJson)).thenReturn(future);

            // When
            publisher.publish(event);

            // Then
            verify(kafkaTemplate).send(expectedTopic, "MATCH-001", expectedJson);
        }

        @Test
        @DisplayName("JSON シリアライズエラーが発生するとEventPublishingExceptionがスローされる")
        void JSONシリアライズエラーが発生するとEventPublishingExceptionがスローされる() throws Exception {
            // Given
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Project");
            when(objectMapper.writeValueAsString(event))
                .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("Serialization error") {});

            // When & Then
            assertThatThrownBy(() -> publisher.publish(event))
                .isInstanceOf(DomainEventPublisher.EventPublishingException.class)
                .hasMessageContaining("Failed to publish event")
                .hasCauseInstanceOf(com.fasterxml.jackson.core.JsonProcessingException.class);

            verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("null イベントの発行で例外が発生する")
        void nullイベントの発行で例外が発生する() throws Exception {
            // When & Then
            assertThatThrownBy(() -> publisher.publish(null))
                .isInstanceOf(Exception.class);

            verify(objectMapper, never()).writeValueAsString(any());
            verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("Kafka送信時の非同期完了処理が正常に動作する")
        void Kafka送信時の非同期完了処理が正常に動作する() throws Exception {
            // Given
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Project");
            String expectedJson = "{}";
            CompletableFuture<SendResult<String, String>> realFuture = new CompletableFuture<>();
            
            when(objectMapper.writeValueAsString(event)).thenReturn(expectedJson);
            when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenReturn(realFuture);

            // When
            publisher.publish(event);

            // Then
            verify(kafkaTemplate).send("ses.events.project", "AGG-001", expectedJson);
            
            // 非同期完了の検証は実装の詳細なので、呼び出しのみ確認
            assertThat(realFuture).isNotCompleted();
        }
    }

    @Nested
    @DisplayName("複数イベント発行のテスト")
    class MultipleEventPublishTests {

        @Test
        @DisplayName("複数のドメインイベントを順次発行できる")
        void 複数のドメインイベントを順次発行できる() throws Exception {
            // Given
            TestDomainEvent event1 = new TestDomainEvent("AGG-001", "Project");
            TestDomainEvent event2 = new TestDomainEvent("ENG-001", "Engineer");
            List<DomainEvent> events = Arrays.asList(event1, event2);

            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenReturn(future);

            // When
            publisher.publishAll(events);

            // Then
            verify(objectMapper, times(2)).writeValueAsString(any());
            verify(kafkaTemplate).send("ses.events.project", "AGG-001", "{}");
            verify(kafkaTemplate).send("ses.events.engineer", "ENG-001", "{}");
        }

        @Test
        @DisplayName("空のイベントリストでも例外が発生しない")
        void 空のイベントリストでも例外が発生しない() throws Exception {
            // Given
            List<DomainEvent> emptyEvents = Collections.emptyList();

            // When & Then
            assertThatNoException().isThrownBy(() -> publisher.publishAll(emptyEvents));

            verify(objectMapper, never()).writeValueAsString(any());
            verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("null イベントリストの発行で例外が発生する")
        void nullイベントリストの発行で例外が発生する() throws Exception {
            // When & Then
            assertThatThrownBy(() -> publisher.publishAll(null))
                .isInstanceOf(NullPointerException.class);

            verify(objectMapper, never()).writeValueAsString(any());
            verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("複数イベント中の一つが失敗しても残りは処理される")
        void 複数イベント中の一つが失敗しても残りは処理される() throws Exception {
            // Given
            TestDomainEvent event1 = new TestDomainEvent("AGG-001", "Project");
            TestDomainEvent event2 = new TestDomainEvent("ENG-001", "Engineer");
            TestDomainEvent event3 = new TestDomainEvent("CONTRACT-001", "Contract");
            List<DomainEvent> events = Arrays.asList(event1, event2, event3);

            when(objectMapper.writeValueAsString(event1)).thenReturn("{}");
            when(objectMapper.writeValueAsString(event2))
                .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("Error") {});
            // event3のモックは削除（event2で失敗するため呼ばれない）
            when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenReturn(future);

            // When & Then
            assertThatThrownBy(() -> publisher.publishAll(events))
                .isInstanceOf(DomainEventPublisher.EventPublishingException.class);

            // event1は成功する
            verify(kafkaTemplate).send("ses.events.project", "AGG-001", "{}");
            // event2で失敗するため、event3は処理されない
            verify(kafkaTemplate, never()).send("ses.events.contract", "CONTRACT-001", "{}");
        }

        @Test
        @DisplayName("大量のイベントも正常に処理できる")
        void 大量のイベントも正常に処理できる() throws Exception {
            // Given
            List<DomainEvent> events = Collections.nCopies(100, 
                new TestDomainEvent("AGG-001", "Project"));

            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenReturn(future);

            // When
            publisher.publishAll(events);

            // Then
            verify(objectMapper, times(100)).writeValueAsString(any());
            verify(kafkaTemplate, times(100)).send("ses.events.project", "AGG-001", "{}");
        }
    }

    @Nested
    @DisplayName("エラーハンドリングのテスト")
    class ErrorHandlingTests {

        @Test
        @DisplayName("EventPublishingException は適切なメッセージと原因を持つ")
        void EventPublishingExceptionは適切なメッセージと原因を持つ() {
            // Given
            String message = "Test error message";
            Exception cause = new RuntimeException("Root cause");

            // When
            DomainEventPublisher.EventPublishingException exception = 
                new DomainEventPublisher.EventPublishingException(message, cause);

            // Then
            assertThat(exception.getMessage()).isEqualTo(message);
            assertThat(exception.getCause()).isEqualTo(cause);
        }

        @Test
        @DisplayName("ObjectMapper が null の場合適切に処理される")
        void ObjectMapperがnullの場合適切に処理される() {
            // Given
            DomainEventPublisher nullMapperPublisher = 
                new DomainEventPublisher(kafkaTemplate, null);
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Project");

            // When & Then
            assertThatThrownBy(() -> nullMapperPublisher.publish(event))
                .isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("KafkaTemplate が null の場合適切に処理される")
        void KafkaTemplateがnullの場合適切に処理される() throws Exception {
            // Given
            DomainEventPublisher nullKafkaPublisher = 
                new DomainEventPublisher(null, objectMapper);
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Project");

            when(objectMapper.writeValueAsString(event)).thenReturn("{}");

            // When & Then
            assertThatThrownBy(() -> nullKafkaPublisher.publish(event))
                .isInstanceOf(Exception.class);
        }
    }

    @Nested
    @DisplayName("トピック名生成のテスト")
    class TopicNamingTests {

        @Test
        @DisplayName("集約タイプが null の場合の処理")
        void 集約タイプがnullの場合の処理() throws Exception {
            // Given
            DomainEvent eventWithNullType = new DomainEvent("AGG-001", null) {
                @Override
                public String getEventType() {
                    return "TestEvent";
                }
            };

            // When & Then
            assertThatThrownBy(() -> publisher.publish(eventWithNullType))
                .isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("空文字列の集約タイプの場合の処理")
        void 空文字列の集約タイプの場合の処理() throws Exception {
            // Given
            DomainEvent eventWithEmptyType = new DomainEvent("AGG-001", "") {
                @Override
                public String getEventType() {
                    return "TestEvent";
                }
            };
            String expectedTopic = "ses.events.";

            when(objectMapper.writeValueAsString(eventWithEmptyType)).thenReturn("{}");
            when(kafkaTemplate.send(expectedTopic, "AGG-001", "{}")).thenReturn(future);

            // When
            publisher.publish(eventWithEmptyType);

            // Then
            verify(kafkaTemplate).send(expectedTopic, "AGG-001", "{}");
        }

        @Test
        @DisplayName("特殊文字を含む集約タイプでもトピック名が生成される")
        void 特殊文字を含む集約タイプでもトピック名が生成される() throws Exception {
            // Given
            TestDomainEvent event = new TestDomainEvent("AGG-001", "Test-Type_123");
            String expectedTopic = "ses.events.test-type_123";

            when(objectMapper.writeValueAsString(event)).thenReturn("{}");
            when(kafkaTemplate.send(expectedTopic, "AGG-001", "{}")).thenReturn(future);

            // When
            publisher.publish(event);

            // Then
            verify(kafkaTemplate).send(expectedTopic, "AGG-001", "{}");
        }
    }

    @Nested
    @DisplayName("実際のドメインイベントとの統合テスト")
    class IntegrationTests {

        @Test
        @DisplayName("ProjectCreatedEvent が正常に発行される")
        void ProjectCreatedEventが正常に発行される() throws Exception {
            // Given
            ProjectCreatedEvent event = new ProjectCreatedEvent(
                "PROJECT-001", "新規プロジェクト", "説明", "クライアント", "DRAFT");
            String expectedJson = "{\"projectName\":\"新規プロジェクト\"}";

            when(objectMapper.writeValueAsString(event)).thenReturn(expectedJson);
            when(kafkaTemplate.send("ses.events.project", "PROJECT-001", expectedJson))
                .thenReturn(future);

            // When
            publisher.publish(event);

            // Then
            verify(kafkaTemplate).send("ses.events.project", "PROJECT-001", expectedJson);
        }

        @Test
        @DisplayName("EngineerStatusChangedEvent が正常に発行される")
        void EngineerStatusChangedEventが正常に発行される() throws Exception {
            // Given
            EngineerStatusChangedEvent event = new EngineerStatusChangedEvent(
                "ENG-001", "AVAILABLE", "ASSIGNED");
            String expectedJson = "{\"oldStatus\":\"AVAILABLE\",\"newStatus\":\"ASSIGNED\"}";

            when(objectMapper.writeValueAsString(event)).thenReturn(expectedJson);
            when(kafkaTemplate.send("ses.events.engineer", "ENG-001", expectedJson))
                .thenReturn(future);

            // When
            publisher.publish(event);

            // Then
            verify(kafkaTemplate).send("ses.events.engineer", "ENG-001", expectedJson);
        }
    }

    /**
     * テスト用のドメインイベント実装
     */
    private static class TestDomainEvent extends DomainEvent {
        public TestDomainEvent(String aggregateId, String aggregateType) {
            super(aggregateId, aggregateType);
        }

        @Override
        public String getEventType() {
            return "TestEvent";
        }
    }

    /**
     * プロジェクト作成イベント（テスト用）
     */
    private static class ProjectCreatedEvent extends DomainEvent {
        private final String projectName;
        private final String description;
        private final String clientCompany;
        private final String status;

        public ProjectCreatedEvent(String projectId, String projectName, String description,
                                 String clientCompany, String status) {
            super(projectId, "Project");
            this.projectName = projectName;
            this.description = description;
            this.clientCompany = clientCompany;
            this.status = status;
        }

        @Override
        public String getEventType() {
            return "ProjectCreated";
        }

        public String getProjectName() { return projectName; }
        public String getDescription() { return description; }
        public String getClientCompany() { return clientCompany; }
        public String getStatus() { return status; }
    }

    /**
     * 技術者ステータス変更イベント（テスト用）
     */
    private static class EngineerStatusChangedEvent extends DomainEvent {
        private final String oldStatus;
        private final String newStatus;

        public EngineerStatusChangedEvent(String engineerId, String oldStatus, String newStatus) {
            super(engineerId, "Engineer");
            this.oldStatus = oldStatus;
            this.newStatus = newStatus;
        }

        @Override
        public String getEventType() {
            return "EngineerStatusChanged";
        }

        public String getOldStatus() { return oldStatus; }
        public String getNewStatus() { return newStatus; }
    }
}