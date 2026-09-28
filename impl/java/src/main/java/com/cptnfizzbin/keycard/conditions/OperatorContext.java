package com.cptnfizzbin.keycard.conditions;

/**
 * Passed to every {@link Operator}'s {@code resolve} call, built-in and custom
 * alike, so an operator can evaluate nested conditions the same way
 * {@code $and}/{@code $or}/{@code $not} do.
 */
public interface OperatorContext {
    /**
     * Evaluates {@code condition} against {@code subject}, preserving whether
     * this point in the tree may still narrow into a field - used
     * by $and/$or/$not, which don't themselves narrow.
     */
    boolean resolveSubcondition(Object subject, Object condition);

    /**
     * Evaluates {@code condition} against a subject already narrowed by one
     * field access, disabling any further field narrowing beneath it
     * - used by the bare-key field path and {@code $field}.
     */
    boolean resolveFieldSubcondition(Object subject, Object condition);

    /**
     * Returns {@code true} if a field condition (bare-key or {@code $field})
     * may still narrow at this point in the tree - the spec permits exactly
     * one level.
     */
    boolean canNarrowField();

    /**
     * Reports a genuine type issue (a malformed operand, a wrong-typed
     * subject) for {@code operator} - never an ordinary non-match. Routed to
     * the {@code KeycardConfig}'s logger when evaluated by a {@code Policy};
     * a custom operator can use it to report its own type issues the same way
     * the built-ins do.
     */
    default void reportTypeIssue(String operator, String message) {
        Diagnostics.logTypeIssue(Diagnostics.DEFAULT_LOGGER, operator, message);
    }
}
