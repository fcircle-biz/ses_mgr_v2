package com.sesmanager.shared.security;

import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Encryption service implementing AES-256-GCM for GDPR-compliant data protection.
 * Used for encrypting personal data throughout the SES Manager system.
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 16;
    private static final int KEY_LENGTH = 256;

    private final SecureRandom secureRandom;

    public EncryptionService() {
        this.secureRandom = new SecureRandom();
    }

    /**
     * Generates a new AES-256 encryption key.
     */
    public SecretKey generateKey() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(ALGORITHM);
            keyGenerator.init(KEY_LENGTH);
            return keyGenerator.generateKey();
        } catch (Exception e) {
            throw new SecurityException("Failed to generate encryption key", e);
        }
    }

    /**
     * Encrypts plain text using AES-256-GCM.
     * 
     * @param plainText The text to encrypt
     * @param secretKey The encryption key
     * @return Base64-encoded encrypted data with IV prepended
     */
    public String encrypt(String plainText, SecretKey secretKey) {
        if (plainText == null || plainText.isEmpty()) {
            return plainText;
        }

        try {
            // Generate random IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            // Initialize cipher
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            // Encrypt the data
            byte[] encryptedData = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Combine IV and encrypted data
            byte[] encryptedWithIv = new byte[GCM_IV_LENGTH + encryptedData.length];
            System.arraycopy(iv, 0, encryptedWithIv, 0, GCM_IV_LENGTH);
            System.arraycopy(encryptedData, 0, encryptedWithIv, GCM_IV_LENGTH, encryptedData.length);

            return Base64.getEncoder().encodeToString(encryptedWithIv);
        } catch (Exception e) {
            throw new SecurityException("Failed to encrypt data", e);
        }
    }

    /**
     * Decrypts encrypted text using AES-256-GCM.
     * 
     * @param encryptedText Base64-encoded encrypted data with IV prepended
     * @param secretKey The decryption key
     * @return Decrypted plain text
     */
    public String decrypt(String encryptedText, SecretKey secretKey) {
        if (encryptedText == null || encryptedText.isEmpty()) {
            return encryptedText;
        }

        try {
            // Decode from Base64
            byte[] encryptedWithIv = Base64.getDecoder().decode(encryptedText);

            // Extract IV and encrypted data
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] encryptedData = new byte[encryptedWithIv.length - GCM_IV_LENGTH];
            System.arraycopy(encryptedWithIv, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(encryptedWithIv, GCM_IV_LENGTH, encryptedData, 0, encryptedData.length);

            // Initialize cipher
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            // Decrypt the data
            byte[] decryptedData = cipher.doFinal(encryptedData);
            return new String(decryptedData, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new SecurityException("Failed to decrypt data", e);
        }
    }

    /**
     * Creates a SecretKey from a Base64-encoded key string.
     */
    public SecretKey keyFromString(String keyString) {
        byte[] keyBytes = Base64.getDecoder().decode(keyString);
        return new SecretKeySpec(keyBytes, ALGORITHM);
    }

    /**
     * Converts a SecretKey to a Base64-encoded string.
     */
    public String keyToString(SecretKey secretKey) {
        return Base64.getEncoder().encodeToString(secretKey.getEncoded());
    }

    /**
     * Masks sensitive data for logging purposes.
     * Shows only first and last 2 characters for strings longer than 4 characters.
     */
    public String maskForLogging(String sensitiveData) {
        if (sensitiveData == null || sensitiveData.length() <= 4) {
            return "***";
        }
        return sensitiveData.substring(0, 2) + "***" + sensitiveData.substring(sensitiveData.length() - 2);
    }
}