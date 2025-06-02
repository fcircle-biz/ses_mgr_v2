package com.sesmanager.shared.domain.exception;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * SES管理システムの基底例外クラス
 * 全てのドメイン例外はこのクラスを継承する
 */
public abstract class SESException extends RuntimeException {
    private final String errorCode;
    private final String userMessage;
    private final Map<String, Object> context;
    private final Instant timestamp;
    private final String correlationId;
    
    protected SESException(
            String errorCode,
            String message,
            String userMessage,
            Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
        this.context = new HashMap<>();
        this.timestamp = Instant.now();
        this.correlationId = UUID.randomUUID().toString();
    }
    
    /**
     * コンテキスト情報の追加
     */
    public SESException addContext(String key, Object value) {
        this.context.put(key, value);
        return this;
    }
    
    /**
     * ログ用詳細情報の取得
     */
    public Map<String, Object> getLoggingContext() {
        Map<String, Object> loggingContext = new HashMap<>(context);
        loggingContext.put("errorCode", errorCode);
        loggingContext.put("timestamp", timestamp);
        loggingContext.put("correlationId", correlationId);
        return loggingContext;
    }
    
    // === 抽象メソッド ===
    
    /**
     * 例外の重要度レベル
     */
    public abstract SeverityLevel getSeverityLevel();
    
    /**
     * リトライ可能かどうか
     */
    public abstract boolean isRetryable();
    
    /**
     * ユーザーに表示可能かどうか
     */
    public abstract boolean isUserDisplayable();
    
    // === ゲッターメソッド ===
    
    public String getErrorCode() { return errorCode; }
    public String getUserMessage() { return userMessage; }
    public Map<String, Object> getContext() { return new HashMap<>(context); }
    public Instant getTimestamp() { return timestamp; }
    public String getCorrelationId() { return correlationId; }
    
    /**
     * 例外の重要度レベル
     */
    public enum SeverityLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}