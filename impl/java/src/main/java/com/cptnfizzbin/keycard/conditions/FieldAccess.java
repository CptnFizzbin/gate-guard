package com.cptnfizzbin.keycard.conditions;

import java.util.Map;
import java.util.Set;

/** Field access for both bare-key field conditions and the {@code $field} operator. */
final class FieldAccess {
    private FieldAccess() {
    }

    /**
     * Evaluates {@code condition} against the {@code fieldName} field of
     * {@code subject}, read from a {@link Map} key or a declared field. A
     * missing field (or null subject) is absence, not a type issue: it
     * satisfies only a bare {@code $ne} (see {@link #isBareNe}). Returns
     * {@code false} and logs a type issue when {@code ctx} doesn't allow field
     * narrowing, i.e. a field condition nested inside another.
     */
    static boolean check(Object subject, String fieldName, Object condition, OperatorContext ctx) {
        // A second narrowing step is a malformed condition shape, not a data
        // mismatch, so it's diagnosed rather than silently returning false.
        if (!ctx.canNarrowField()) {
            Diagnostics.logTypeIssue(fieldName,
                "v1 supports only top-level field access - a field condition can't itself narrow into another field");
            return false;
        }

        if (subject instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) subject;
            if (!map.containsKey(fieldName)) return isBareNe(condition);
            return ctx.resolveFieldSubcondition(map.get(fieldName), condition);
        }
        if (subject == null) {
            return isBareNe(condition);
        }
        try {
            java.lang.reflect.Field field = subject.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            Object subjectValue = field.get(subject);
            return ctx.resolveFieldSubcondition(subjectValue, condition);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            return isBareNe(condition);
        }
    }

    /**
     * Returns {@code true} when {@code condition} is exactly
     * {@code { $ne: ... }} - the only field condition a missing field
     * satisfies. A {@code $ne} that is one key among several, or nested
     * deeper, doesn't count.
     */
    private static boolean isBareNe(Object condition) {
        // The spec requires $ne to be the exact negation of $eq, and $eq on a
        // missing field is false, so a bare $ne on a missing field must be true;
        // every other operator keeps the blanket false.
        // TODO: decide whether { $not: { $eq: x } } on a missing field should
        // also be true, since $not carries the same "exact negation" contract as $ne.
        return condition instanceof Map && ((Map<?, ?>) condition).keySet().equals(Set.of("$ne"));
    }
}
