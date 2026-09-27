package com.cptnfizzbin.keycard.conditions;

import java.util.Collection;

/**
 * Containment logic for {@code $in}/{@code $has} over an already-validated
 * {@link Collection}; callers type-check it and log any diagnostic. Elements
 * compare with {@code $eq} semantics.
 */
public final class GroupConditions {
    private GroupConditions() {}

    /** {@code $in}: returns {@code true} when {@code array} contains {@code subject}. */
    public static boolean in(Object subject, Collection<?> array) {
        for (Object v : array) {
            if (StringConditions.eq(subject, v)) return true;
        }
        return false;
    }

    /** {@code $has}: returns {@code true} when {@code subject} contains {@code value}. */
    public static boolean has(Collection<?> subject, Object value) {
        for (Object v : subject) {
            if (StringConditions.eq(v, value)) return true;
        }
        return false;
    }
}
