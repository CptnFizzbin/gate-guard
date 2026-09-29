package com.cptnfizzbin.keycard.conditions;

import com.cptnfizzbin.keycard.errors.PolicyLoadException;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * Every operator a {@link ConditionResolver} can dispatch to: the built-ins,
 * registered on construction, plus any custom ones added after. Built-ins
 * can't be removed or replaced.
 */
public final class OperatorCatalog {
    public static final Set<String> BUILTIN_NAMES = DefaultOperators.NAMES;

    private final Map<String, Operator> operators = new LinkedHashMap<>();

    public OperatorCatalog() {
        this.addAll(DefaultOperators.ALL);
    }

    /**
     * Registers {@code operator} under its name.
     *
     * @throws PolicyLoadException if the name isn't {@code "$"} followed by at
     *   least one character (any other condition key is a field name, so it
     *   could never be dispatched), or an operator with that name is already
     *   registered, built-in or custom
     */
    public OperatorCatalog add(Operator operator) {
        String name = operator.name();
        if (name == null || !name.startsWith("$") || name.length() < 2) {
            throw new PolicyLoadException(
                "Invalid operator name \"" + name + "\": operator names MUST start with \"$\" (e.g. \"$hasRole\")."
            );
        }
        if (operators.containsKey(name)) {
            throw new PolicyLoadException(
                "Duplicate operator \"" + name + "\": an operator with this name is already registered"
                    + " (built-in or custom) - operator names MUST be unique."
            );
        }
        operators.put(name, operator);
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
     * @throws PolicyLoadException if {@code name} isn't a valid operator name
     *   (see {@link #add}) or is already registered, built-in or custom
     */
    public ConditionOperator set(String name, ConditionOperator operator) {
        this.add(Operator.of(name, (subject, value, ctx) -> operator.resolve(subject, value)));
        return operator;
    }

    /** The operator registered under {@code name}, or {@code null}. */
    public Operator get(String name) {
        return operators.get(name);
    }

    public boolean contains(String name) {
        return operators.containsKey(name);
    }

    /** Every registered operator name, built-ins first, in registration order. */
    public Set<String> names() {
        return Collections.unmodifiableSet(operators.keySet());
    }

    /** Every registered operator name that isn't a built-in, in registration order. */
    public Set<String> customNames() {
        Set<String> names = new LinkedHashSet<>(operators.keySet());
        names.removeAll(BUILTIN_NAMES);
        return names;
    }
}
