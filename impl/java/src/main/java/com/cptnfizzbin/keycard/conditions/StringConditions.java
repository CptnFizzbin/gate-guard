package com.cptnfizzbin.keycard.conditions;

import java.math.BigDecimal;

public final class StringConditions {
    private StringConditions() {}

    /**
     * {@code $eq}: value equality for primitives, not reference/identity
     * equality. Numbers compare by value regardless of boxed type, and
     * {@code NaN} never equals anything, itself included.
     */
    public static boolean eq(Object subject, Object expected) {
        if (subject instanceof Number a && expected instanceof Number b) {
            return numericEq(a, b);
        }
        if (subject == null || expected == null) {
            return subject == expected;
        }
        return subject.equals(expected);
    }

    /**
     * Compares numbers by value, regardless of boxed type. Integral values
     * compare exactly (no precision loss above 2^53); anything involving a
     * float/double uses IEEE-754 {@code ==}.
     */
    private static boolean numericEq(Number a, Number b) {
        // Not Number.equals: Integer.equals(Long) is always false, but a claims
        // field declared long must equal the Integer a JSON/YAML parser produces
        // for the same literal. IEEE-754 == (unlike Double.equals) also keeps
        // NaN unequal to itself, as the spec requires.
        if (isFloatingPoint(a) || isFloatingPoint(b)) {
            return a.doubleValue() == b.doubleValue();
        }
        return toBigDecimal(a).compareTo(toBigDecimal(b)) == 0;
    }

    private static boolean isFloatingPoint(Number n) {
        return n instanceof Double || n instanceof Float;
    }

    private static BigDecimal toBigDecimal(Number n) {
        return n instanceof BigDecimal bd ? bd : new BigDecimal(n.toString());
    }

    /** {@code $ne}: the exact negation of {@link #eq}. */
    public static boolean ne(Object subject, Object expected) {
        return !eq(subject, expected);
    }
}
