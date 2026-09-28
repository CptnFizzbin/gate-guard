package com.cptnfizzbin.keycard.conditions;

/**
 * Error-level diagnostics for genuine type issues in a condition, identifying
 * the operator and what went wrong. Never used for an ordinary non-match (a
 * missing field, an unmatched action/subject, an unregistered operator).
 */
final class Diagnostics {
    private static final String DIAGNOSTIC_PREFIX = "[KeyCard]";

    private Diagnostics() {}

    static void logTypeIssue(String operator, String message) {
        System.err.println(DIAGNOSTIC_PREFIX + " " + operator + ": " + message);
    }

    static String typeName(Object value) {
        return value == null ? "null" : value.getClass().getSimpleName();
    }
}
