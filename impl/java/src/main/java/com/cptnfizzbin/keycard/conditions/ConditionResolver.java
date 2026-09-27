package com.cptnfizzbin.keycard.conditions;

import java.util.Map;

/**
 * Evaluates a Conditions tree against a subject, using the built-in operators
 * plus any custom operators in the {@link OperatorCatalog} it was constructed
 * with.
 */
public final class ConditionResolver {
    private final OperatorCatalog registry;
    private final OperatorContext topContext = new Ctx(true);
    private final OperatorContext nestedContext = new Ctx(false);

    public ConditionResolver() {
        this(new OperatorCatalog());
    }

    public ConditionResolver(OperatorCatalog operators) {
        this.registry = operators != null ? operators : new OperatorCatalog();
    }

    public boolean evaluate(Object subject, Object condition) {
        return evaluate(subject, condition, true);
    }

    /** Throws a {@link com.cptnfizzbin.keycard.errors.PolicyLoadException} if any name in {@code names} isn't registered, built-in or custom. */
    public void assertAllRegistered(Iterable<String> names) {
        for (String name : names) {
            if (!registry.containsKey(name)) {
                throw new com.cptnfizzbin.keycard.errors.PolicyLoadException(
                    "meta.operators declares \"" + name + "\" but no operator with that name is registered."
                );
            }
        }
    }

    private boolean evaluate(Object subject, Object condition, boolean canNarrowField) {
        if (condition instanceof Condition<?> wrapped) {
            condition = wrapped.toMap();
        }

        if (condition == null || condition instanceof String || condition instanceof Number || condition instanceof Boolean) {
            // A bare value is shorthand for $eq; an explicit null means "equals null", not a wildcard.
            return StringConditions.eq(subject, condition);
        }

        if (!(condition instanceof Map<?, ?> condMap)) {
            return false;
        }

        // The spec requires every key to be evaluated and ANDed together - no
        // key may "consume" the whole object or cause sibling keys to be ignored.
        for (Map.Entry<?, ?> entry : condMap.entrySet()) {
            if (!evaluateKey(subject, String.valueOf(entry.getKey()), entry.getValue(), canNarrowField)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Evaluates one condition key: a {@code $}-prefixed key names an operator
     * (an unregistered one never matches), and any other key names a field.
     */
    private boolean evaluateKey(Object subject, String key, Object value, boolean canNarrowField) {
        OperatorContext ctx = contextFor(canNarrowField);

        if (!key.startsWith("$")) {
            return FieldAccess.check(subject, key, value, ctx);
        }

        Operator operator = registry.get(key);
        if (operator == null) return false;

        return operator.resolve(subject, value, ctx);
    }

    private OperatorContext contextFor(boolean canNarrowField) {
        return canNarrowField
            ? topContext
            : nestedContext;
    }

    final class Ctx implements OperatorContext {
        private final boolean canNarrowField;

        Ctx(boolean canNarrowField) {
            this.canNarrowField = canNarrowField;
        }

        @Override
        public boolean resolveSubcondition(Object subject, Object condition) {
            return evaluate(subject, condition, canNarrowField);
        }

        @Override
        public boolean resolveFieldSubcondition(Object subject, Object condition) {
            return evaluate(subject, condition, false);
        }

        @Override
        public boolean canNarrowField() {
            return canNarrowField;
        }
    }
}
