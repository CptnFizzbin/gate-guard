package com.cptnfizzbin.keycard.conditions;

import java.lang.System.Logger;
import java.lang.System.Logger.Level;

/**
 * Error-level diagnostics for genuine type issues in a condition, identifying
 * the operator and what went wrong. Never used for an ordinary non-match (a
 * missing field, an unmatched action/subject, an unregistered operator).
 */
final class Diagnostics {
    private static final String DIAGNOSTIC_PREFIX = "[KeyCard]";

    static final Logger DEFAULT_LOGGER = System.getLogger("Keycard");

    private Diagnostics() {}

    static void logTypeIssue(Logger logger, String operator, String message) {
        logger.log(Level.ERROR, DIAGNOSTIC_PREFIX + " " + operator + ": " + message);
    }

    static String typeName(Object value) {
        return value == null ? "null" : value.getClass().getSimpleName();
    }
}
