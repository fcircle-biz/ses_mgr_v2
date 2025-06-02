package com.sesmanager.shared.domain.exception;

/**
 * ビジネス例外基底クラス
 * ビジネスルール違反やドメインロジックエラーの基底クラス
 */
public abstract class SESBusinessException extends SESException {
    
    protected SESBusinessException(
            String errorCode,
            String message,
            String userMessage,
            Throwable cause) {
        super(errorCode, message, userMessage, cause);
    }
}