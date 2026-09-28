package com.cptnfizzbin.keycard.conditions;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

final class FieldAccess {
    private FieldAccess() {
    }

    /** An empty {@code Optional} caches a miss, so an absent field isn't re-resolved on every evaluation. */
    private static final ClassValue<Map<String, Optional<Accessor>>> ACCESSORS = new ClassValue<>() {
        @Override
        protected Map<String, Optional<Accessor>> computeValue(Class<?> type) {
            return new ConcurrentHashMap<>();
        }
    };

    @FunctionalInterface
    private interface Accessor {
        Object read(Object target) throws ReflectiveOperationException;
    }

    /**
     * Evaluates {@code condition} against the {@code fieldName} field of
     * {@code subject}: a {@link Map} key, or else a field declared on the
     * subject's class or a superclass, or else a public no-arg accessor
     * ({@code name()}, {@code getName()}, {@code isName()}). A missing field
     * (or null subject) is absence, not a type issue: it satisfies only a bare
     * {@code $ne}.
     */
    static boolean check(Object subject, String fieldName, Object condition, OperatorContext ctx) {
        // A second narrowing step is a malformed condition shape, not a data
        // mismatch, so it's diagnosed rather than silently returning false.
        if (!ctx.canNarrowField()) {
            ctx.reportTypeIssue(fieldName,
                "v1 supports only top-level field access - a field condition can't itself narrow into another field");
            return false;
        }

        // The spec requires $ne to be the exact negation of $eq, and $eq on a
        // missing field is false, so a bare $ne on a missing field must be true;
        // every other condition on a missing field is false.
        if (subject instanceof Map<?, ?> map) {
            if (!map.containsKey(fieldName)) return isBareNe(condition);
            return ctx.resolveFieldSubcondition(map.get(fieldName), condition);
        }
        if (subject == null) {
            return isBareNe(condition);
        }

        Optional<Accessor> accessor = ACCESSORS.get(subject.getClass())
            .computeIfAbsent(fieldName, name -> findAccessor(subject.getClass(), name));
        if (accessor.isEmpty()) {
            return isBareNe(condition);
        }

        Object subjectValue;
        try {
            subjectValue = accessor.get().read(subject);
        } catch (InvocationTargetException e) {
            ctx.reportTypeIssue(fieldName, "reading the field threw " + e.getCause());
            return false;
        } catch (ReflectiveOperationException e) {
            return isBareNe(condition);
        }
        return ctx.resolveFieldSubcondition(subjectValue, condition);
    }

    private static Optional<Accessor> findAccessor(Class<?> type, String name) {
        if (name.isEmpty()) return Optional.empty();

        // trySetAccessible, not setAccessible: a member the module system won't open
        // is skipped instead of throwing InaccessibleObjectException out of Policy.can.
        for (Class<?> c = type; c != null && c != Object.class; c = c.getSuperclass()) {
            try {
                Field field = c.getDeclaredField(name);
                if (!Modifier.isStatic(field.getModifiers()) && field.trySetAccessible()) {
                    return Optional.of(field::get);
                }
            } catch (NoSuchFieldException ignored) {
            }
        }

        String capitalized = Character.toUpperCase(name.charAt(0)) + name.substring(1);
        for (String candidate : List.of(name, "get" + capitalized, "is" + capitalized)) {
            try {
                Method method = type.getMethod(candidate);
                // Object's own methods (getClass(), hashCode(), ...) are never subject fields.
                if (method.getDeclaringClass() != Object.class && !Modifier.isStatic(method.getModifiers())
                    && method.getReturnType() != void.class && method.trySetAccessible()) {
                    return Optional.of(method::invoke);
                }
            } catch (NoSuchMethodException ignored) {
            }
        }
        return Optional.empty();
    }

    private static boolean isBareNe(Object condition) {
        // TODO: decide whether { $not: { $eq: x } } on a missing field should
        // also be true, since $not carries the same "exact negation" contract as $ne.
        return condition instanceof Map && ((Map<?, ?>) condition).keySet().equals(Set.of("$ne"));
    }
}
