package com.cptnfizzbin.keycard.policy;

import com.cptnfizzbin.keycard.errors.PolicyLoadException;

/**
 * A declared {@code meta.anyAction}/{@code meta.anySubject}: either disabled
 * or a named token. An undeclared position is represented by {@code null}
 * rather than a {@code WildcardToken}, and defaults to {@code "_ANY_"} (see
 * {@link Wildcards}).
 */
public sealed interface WildcardToken {
    /** The wildcard mechanism is disabled for this position - no string, including {@code "_ANY_"}, has special meaning. */
    record Disabled() implements WildcardToken {}

    /** An explicit wildcard token string. */
    record Named(String token) implements WildcardToken {}

    Disabled DISABLED = new Disabled();

    /**
     * Parses a raw declaration: {@code null} or {@code false} disables the
     * wildcard and a {@link String} names a token.
     *
     * @throws PolicyLoadException for any other value (a number, {@code true},
     *   a list, ...), which is never coerced
     */
    static WildcardToken of(Object raw) {
        if (raw == null) return DISABLED;
        if (raw instanceof Boolean) {
            if (Boolean.FALSE.equals(raw)) return DISABLED;
            throw new PolicyLoadException(
                "meta.anyAction/meta.anySubject: \"true\" is not a valid declaration - use a string token to name"
                    + " a wildcard, or null/false to disable it."
            );
        }
        if (raw instanceof String) return new Named((String) raw);
        throw new PolicyLoadException(
            "meta.anyAction/meta.anySubject: expected a string, null, or false, got "
                + raw.getClass().getSimpleName() + "."
        );
    }
}
