package com.cptnfizzbin.keycard.conditions;

/**
 * A flat {@code (subjectValue, value) -> boolean} custom operator, for one
 * that just compares two values. Registered via
 * {@link OperatorCatalog#set(String, ConditionOperator)}. A custom operator
 * that evaluates nested conditions implements {@link Operator} instead.
 */
@FunctionalInterface
public interface ConditionOperator {
    boolean resolve(Object subjectValue, Object value);
}
