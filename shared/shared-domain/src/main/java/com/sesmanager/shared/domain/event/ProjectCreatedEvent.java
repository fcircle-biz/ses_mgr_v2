package com.sesmanager.shared.domain.event;

import com.sesmanager.shared.domain.DomainEvent;

/**
 * プロジェクト作成ドメインイベント
 * プロジェクトが新規作成された際に発行される
 */
public class ProjectCreatedEvent extends DomainEvent {
    
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

    public String getProjectName() {
        return projectName;
    }

    public String getDescription() {
        return description;
    }

    public String getClientCompany() {
        return clientCompany;
    }

    public String getStatus() {
        return status;
    }
}