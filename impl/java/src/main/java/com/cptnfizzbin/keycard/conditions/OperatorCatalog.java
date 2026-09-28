package com.cptnfizzbin.keycard.conditions;

import com.cptnfizzbin.keycard.errors.PolicyLoadException;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Set;

public final class OperatorCatalog extends LinkedHashMap<String, Operator> {
    /** The names of every built-in operator, which a new catalog registers by default. */
    public static final Set<String> BUILTIN_NAMES = DefaultOperators.NAMES;

    public OperatorCatalog() {
        this.addAll(DefaultOperators.ALL);
    }

    /**
     * Registers {@code operator} under its name.
     *
     * @throws PolicyLoadException if an operator with that name is already
     *   registered, built-in or custom
     */
    public OperatorCatalog add(Operator operator) {
        if (this.containsKey(operator.name())) {
            throw new PolicyLoadException(
                "Duplicate operator \"" + operator.name() + "\": an operator with this name is already registered"
                    + " (built-in or custom) - operator names MUST be unique."
            );
        }
        this.put(operator.name(), operator);
        return this;
    }

    public OperatorCatalog addAll(Collection<Operator> operators) {
        operators.forEach(this::add);
        return this;
    }

    /**
     * Registers a flat {@link ConditionOperator} under {@code name} and
     * returns it.
     *
     * @throws PolicyLoadException if an operator named {@code name} is already
     *   registered, built-in or custom
     */
    public ConditionOperator set(String name, ConditionOperator operator) {
        this.add(Operator.of(name, (subject, value, ctx) -> operator.resolve(subject, value)));
        return operator;
    }

    /** Every registered operator name that isn't one of the built-ins - what {@code meta.operators} derives from usage. */
    public Set<String> customNames() {
        Set<String> names = new LinkedHashSet<>(this.keySet());
        names.removeAll(BUILTIN_NAMES);
        return names;
    }
}
