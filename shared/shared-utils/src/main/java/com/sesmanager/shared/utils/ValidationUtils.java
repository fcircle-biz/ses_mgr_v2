package com.sesmanager.shared.utils;

import org.apache.commons.lang3.StringUtils;

import java.util.regex.Pattern;

/**
 * Utility class for common validation operations used across the SES Manager system.
 */
public final class ValidationUtils {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$"
    );
    
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "^\\+?[1-9]\\d{1,14}$|^0\\d{9,10}$"
    );
    
    private static final Pattern POSTAL_CODE_JP_PATTERN = Pattern.compile(
        "^\\d{3}-\\d{4}$|^\\d{7}$"
    );

    private ValidationUtils() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * Validates email address format.
     */
    public static boolean isValidEmail(String email) {
        return StringUtils.isNotBlank(email) && EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * Validates phone number format (supports Japanese and international formats).
     */
    public static boolean isValidPhoneNumber(String phoneNumber) {
        return StringUtils.isNotBlank(phoneNumber) && 
               PHONE_PATTERN.matcher(phoneNumber.replaceAll("[\\s-()]", "")).matches();
    }

    /**
     * Validates Japanese postal code format (123-4567 or 1234567).
     */
    public static boolean isValidJapanesePostalCode(String postalCode) {
        return StringUtils.isNotBlank(postalCode) && 
               POSTAL_CODE_JP_PATTERN.matcher(postalCode).matches();
    }

    /**
     * Validates that a string is not null, not empty, and not just whitespace.
     */
    public static boolean isNotBlank(String value) {
        return StringUtils.isNotBlank(value);
    }

    /**
     * Validates that a string length is within the specified range.
     */
    public static boolean isLengthValid(String value, int minLength, int maxLength) {
        if (value == null) {
            return minLength == 0;
        }
        int length = value.length();
        return length >= minLength && length <= maxLength;
    }

    /**
     * Validates that a value is within the specified numeric range.
     */
    public static boolean isInRange(Number value, Number min, Number max) {
        if (value == null) {
            return false;
        }
        double val = value.doubleValue();
        double minVal = min.doubleValue();
        double maxVal = max.doubleValue();
        return val >= minVal && val <= maxVal;
    }

    /**
     * Normalizes a phone number by removing spaces, hyphens, and parentheses.
     */
    public static String normalizePhoneNumber(String phoneNumber) {
        if (StringUtils.isBlank(phoneNumber)) {
            return phoneNumber;
        }
        return phoneNumber.replaceAll("[\\s-()]", "");
    }

    /**
     * Normalizes a postal code by removing spaces and hyphens, then formatting as 123-4567.
     */
    public static String normalizeJapanesePostalCode(String postalCode) {
        if (StringUtils.isBlank(postalCode)) {
            return postalCode;
        }
        String normalized = postalCode.replaceAll("[\\s-]", "");
        if (normalized.length() == 7) {
            return normalized.substring(0, 3) + "-" + normalized.substring(3);
        }
        return postalCode; // Return original if not 7 digits
    }

    /**
     * Sanitizes input string for safe database storage by trimming and removing control characters.
     */
    public static String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        return input.trim().replaceAll("\\p{Cntrl}", "");
    }
}