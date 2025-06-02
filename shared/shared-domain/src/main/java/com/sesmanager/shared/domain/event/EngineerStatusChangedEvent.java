package com.sesmanager.shared.domain.event;

import com.sesmanager.shared.domain.DomainEvent;

/**
 * 技術者ステータス変更ドメインイベント
 * 技術者のステータスが変更された際に発行される
 */
public class EngineerStatusChangedEvent extends DomainEvent {
    
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

    public String getOldStatus() {
        return oldStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }
}