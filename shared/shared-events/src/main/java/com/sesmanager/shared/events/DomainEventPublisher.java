package com.sesmanager.shared.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sesmanager.shared.domain.DomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

/**
 * Publisher for domain events using Apache Kafka.
 * Enables event-driven communication between bounded contexts.
 */
@Component
public class DomainEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(DomainEventPublisher.class);
    private static final String TOPIC_PREFIX = "ses.events.";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public DomainEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Publishes a domain event to the appropriate Kafka topic.
     * 
     * @param event The domain event to publish
     */
    public void publish(DomainEvent event) {
        try {
            String topic = TOPIC_PREFIX + event.getAggregateType().toLowerCase();
            String eventJson = objectMapper.writeValueAsString(event);
            String key = event.getAggregateId();

            logger.debug("Publishing event {} to topic {} with key {}", 
                        event.getClass().getSimpleName(), topic, key);

            CompletableFuture<SendResult<String, String>> future = 
                kafkaTemplate.send(topic, key, eventJson);

            future.whenComplete((result, ex) -> {
                if (ex == null) {
                    logger.info("Successfully published event {} with key {} to topic {} at offset {}",
                               event.getClass().getSimpleName(), key, topic, 
                               result.getRecordMetadata().offset());
                } else {
                    logger.error("Failed to publish event {} with key {} to topic {}: {}",
                                event.getClass().getSimpleName(), key, topic, ex.getMessage(), ex);
                }
            });

        } catch (Exception e) {
            logger.error("Error serializing event {}: {}", event.getClass().getSimpleName(), e.getMessage(), e);
            throw new EventPublishingException("Failed to publish event", e);
        }
    }

    /**
     * Publishes multiple domain events in batch.
     * 
     * @param events The domain events to publish
     */
    public void publishAll(Iterable<DomainEvent> events) {
        for (DomainEvent event : events) {
            publish(event);
        }
    }

    /**
     * Exception thrown when event publishing fails.
     */
    public static class EventPublishingException extends RuntimeException {
        public EventPublishingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}