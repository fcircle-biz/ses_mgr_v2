package com.sesmanager.shared.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * AggregateRoot基底クラスの単体テスト
 * TDD Red-Green-Refactor サイクルに従って実装
 */
@DisplayName("AggregateRoot 基底クラステスト")
class AggregateRootTest {

    @Nested
    @DisplayName("基本機能のテスト")
    class BasicFunctionalityTests {

        @Test
        @DisplayName("集約ルートを作成できる")
        void 集約ルートを作成できる() {
            // When
            TestAggregateRoot aggregate = new TestAggregateRoot();

            // Then
            assertThat(aggregate.getId()).isNotNull();
            assertThat(aggregate.getCreatedAt()).isNotNull();
            assertThat(aggregate.getUpdatedAt()).isNotNull();
            assertThat(aggregate.getVersion()).isEqualTo(0L);
            assertThat(aggregate.getCreatedBy()).isNull();
            assertThat(aggregate.getUpdatedBy()).isNull();
        }

        @Test
        @DisplayName("指定したIDで集約ルートを作成できる")
        void 指定したIDで集約ルートを作成できる() {
            // Given
            UUID id = UUID.randomUUID();

            // When
            TestAggregateRoot aggregate = new TestAggregateRoot(id);

            // Then
            assertThat(aggregate.getId()).isEqualTo(id);
        }

        @Test
        @DisplayName("作成者と更新者を設定できる")
        void 作成者と更新者を設定できる() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();
            String creator = "user001";
            String updater = "user002";

            // When
            aggregate.setCreatedBy(creator);
            aggregate.setUpdatedBy(updater);

            // Then
            assertThat(aggregate.getCreatedBy()).isEqualTo(creator);
            assertThat(aggregate.getUpdatedBy()).isEqualTo(updater);
        }

        @Test
        @DisplayName("更新者設定時に更新日時が更新される")
        void 更新者設定時に更新日時が更新される() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();
            Instant originalUpdatedAt = aggregate.getUpdatedAt();

            // Wait a small amount to ensure time difference
            try {
                Thread.sleep(1);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            // When
            aggregate.setUpdatedBy("user001");

            // Then
            assertThat(aggregate.getUpdatedAt()).isAfter(originalUpdatedAt);
        }
    }

    @Nested
    @DisplayName("ドメインイベント管理のテスト")
    class DomainEventManagementTests {

        @Test
        @DisplayName("ドメインイベントを追加できる")
        void ドメインイベントを追加できる() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();
            TestDomainEvent event = new TestDomainEvent(aggregate.getId().toString(), "TestAggregate");

            // When
            aggregate.addEvent(event);

            // Then
            List<DomainEvent> events = aggregate.getDomainEvents();
            assertThat(events).hasSize(1);
            assertThat(events.get(0)).isEqualTo(event);
        }

        @Test
        @DisplayName("複数のドメインイベントを追加できる")
        void 複数のドメインイベントを追加できる() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();
            TestDomainEvent event1 = new TestDomainEvent(aggregate.getId().toString(), "TestAggregate");
            TestDomainEvent event2 = new TestDomainEvent(aggregate.getId().toString(), "TestAggregate");

            // When
            aggregate.addEvent(event1);
            aggregate.addEvent(event2);

            // Then
            List<DomainEvent> events = aggregate.getDomainEvents();
            assertThat(events).hasSize(2);
            assertThat(events).containsExactly(event1, event2);
        }

        @Test
        @DisplayName("ドメインイベントを取得してクリアできる")
        void ドメインイベントを取得してクリアできる() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();
            TestDomainEvent event1 = new TestDomainEvent(aggregate.getId().toString(), "TestAggregate");
            TestDomainEvent event2 = new TestDomainEvent(aggregate.getId().toString(), "TestAggregate");
            aggregate.addEvent(event1);
            aggregate.addEvent(event2);

            // When
            List<DomainEvent> pulledEvents = aggregate.pullDomainEvents();

            // Then
            assertThat(pulledEvents).hasSize(2);
            assertThat(pulledEvents).containsExactly(event1, event2);
            
            // Events should be cleared after pulling
            assertThat(aggregate.getDomainEvents()).isEmpty();
        }

        @Test
        @DisplayName("getDomainEventsは不変リストを返す")
        void getDomainEventsは不変リストを返す() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();
            TestDomainEvent event = new TestDomainEvent(aggregate.getId().toString(), "TestAggregate");
            aggregate.addEvent(event);

            // When
            List<DomainEvent> events = aggregate.getDomainEvents();

            // Then
            assertThatThrownBy(() -> events.add(new TestDomainEvent("OTHER-ID", "Other")))
                .isInstanceOf(UnsupportedOperationException.class);
        }
    }

    @Nested
    @DisplayName("等価性とハッシュコードのテスト")
    class EqualityAndHashCodeTests {

        @Test
        @DisplayName("同じIDの集約ルートは等しい")
        void 同じIDの集約ルートは等しい() {
            // Given
            UUID id = UUID.randomUUID();
            TestAggregateRoot aggregate1 = new TestAggregateRoot(id);
            TestAggregateRoot aggregate2 = new TestAggregateRoot(id);

            // Then
            assertThat(aggregate1).isEqualTo(aggregate2);
            assertThat(aggregate1.hashCode()).isEqualTo(aggregate2.hashCode());
        }

        @Test
        @DisplayName("異なるIDの集約ルートは等しくない")
        void 異なるIDの集約ルートは等しくない() {
            // Given
            TestAggregateRoot aggregate1 = new TestAggregateRoot();
            TestAggregateRoot aggregate2 = new TestAggregateRoot();

            // Then
            assertThat(aggregate1).isNotEqualTo(aggregate2);
        }

        @Test
        @DisplayName("nullとは等しくない")
        void nullとは等しくない() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();

            // Then
            assertThat(aggregate).isNotEqualTo(null);
        }

        @Test
        @DisplayName("異なるクラスとは等しくない")
        void 異なるクラスとは等しくない() {
            // Given
            TestAggregateRoot aggregate = new TestAggregateRoot();
            String other = "not an aggregate";

            // Then
            assertThat(aggregate).isNotEqualTo(other);
        }
    }

    /**
     * テスト用の集約ルート実装
     */
    private static class TestAggregateRoot extends AggregateRoot {
        public TestAggregateRoot() {
            super();
        }

        public TestAggregateRoot(UUID id) {
            super(id);
        }

        // テスト用にaddDomainEventを公開
        public void addEvent(DomainEvent event) {
            addDomainEvent(event);
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
}