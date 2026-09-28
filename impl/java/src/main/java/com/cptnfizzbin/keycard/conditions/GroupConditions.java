package com.cptnfizzbin.keycard.conditions;

import java.util.Collection;

/** Containment for {@code $in}/{@code $has}; elements compare with {@code $eq} semantics. */
public final class GroupConditions {
    private GroupConditions() {}

    public static boolean in(Object subject, Collection<?> array) {
        for (Object v : array) {
            if (StringConditions.eq(subject, v)) return true;
        }
        return false;
    }

    public static boolean has(Collection<?> subject, Object value) {
        for (Object v : subject) {
            if (StringConditions.eq(v, value)) return true;
        }
        return false;
    }
}
