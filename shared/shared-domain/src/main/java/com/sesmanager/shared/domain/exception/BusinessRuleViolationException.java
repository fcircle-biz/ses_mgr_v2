package com.sesmanager.shared.domain.exception;

/**
 * ビジネスルール違反例外
 * ドメインロジックの制約違反時に発生
 */
public class BusinessRuleViolationException extends SESBusinessException {
    private final String ruleName;
    private final String aggregateType;
    private final String aggregateId;
    
    public BusinessRuleViolationException(
            String ruleName,
            String message,
            String aggregateType,
            String aggregateId) {
        super(
            "BUSINESS_RULE_VIOLATION",
            message,
            "業務ルールに違反しています: " + message,
            null
        );
        this.ruleName = ruleName;
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        
        addContext("ruleName", ruleName);
        addContext("aggregateType", aggregateType);
        addContext("aggregateId", aggregateId);
    }
    
    @Override
    public SeverityLevel getSeverityLevel() { 
        return SeverityLevel.MEDIUM; 
    }
    
    @Override
    public boolean isRetryable() { 
        return false; 
    }
    
    @Override
    public boolean isUserDisplayable() { 
        return true; 
    }
    
    // ゲッターメソッド
    public String getRuleName() {
        return ruleName;
    }
    
    public String getAggregateType() {
        return aggregateType;
    }
    
    public String getAggregateId() {
        return aggregateId;
    }
    
    // ファクトリーメソッド
    public static BusinessRuleViolationException projectStatusTransition(
            String projectId, String currentStatus, String targetStatus) {
        return new BusinessRuleViolationException(
            "PROJECT_STATUS_TRANSITION",
            String.format("プロジェクトの状態遷移が無効です: %s -> %s", currentStatus, targetStatus),
            "Project",
            projectId
        );
    }
    
    public static BusinessRuleViolationException engineerNotAvailable(String engineerId) {
        return new BusinessRuleViolationException(
            "ENGINEER_NOT_AVAILABLE",
            "技術者は現在稼働不可です",
            "Engineer",
            engineerId
        );
    }
    
    public static BusinessRuleViolationException contractAlreadySigned(String contractId) {
        return new BusinessRuleViolationException(
            "CONTRACT_ALREADY_SIGNED",
            "契約は既に署名済みです",
            "Contract",
            contractId
        );
    }
}