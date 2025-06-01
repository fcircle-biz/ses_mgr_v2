package com.sesmanager.shared.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.time.Instant;
import java.util.UUID;

/**
 * Base class for all domain events in the SES Manager system.
 * Implements event-driven architecture patterns for cross-context communication.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, property = "@type")
public abstract class DomainEvent {
    
    private final UUID eventId;
    private final String aggregateId;
    private final String aggregateType;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private final Instant occurredOn;
    
    private final Long version;

    protected DomainEvent(String aggregateId, String aggregateType) {
        this(aggregateId, aggregateType, 1L);
    }

    protected DomainEvent(String aggregateId, String aggregateType, Long version) {
        this.eventId = UUID.randomUUID();
        this.aggregateId = aggregateId;
        this.aggregateType = aggregateType;
        this.occurredOn = Instant.now();
        this.version = version;
    }

    public UUID getEventId() {
        return eventId;
    }

    public String getAggregateId() {
        return aggregateId;
    }

    public String getAggregateType() {
        return aggregateType;
    }

    public Instant getOccurredOn() {
        return occurredOn;
    }

    public Long getVersion() {
        return version;
    }

    /**
     * Returns the event type for routing and processing.
     */
    public abstract String getEventType();

    @Override
    public String toString() {
        return String.format("%s{eventId=%s, aggregateId=%s, aggregateType=%s, occurredOn=%s, version=%d}",
                getClass().getSimpleName(), eventId, aggregateId, aggregateType, occurredOn, version);
    }
}