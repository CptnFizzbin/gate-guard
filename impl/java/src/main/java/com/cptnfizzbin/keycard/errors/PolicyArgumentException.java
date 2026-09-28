package com.cptnfizzbin.keycard.errors;

import lombok.experimental.StandardException;

/**
 * Thrown at the call site when {@code PolicyBuilder}, a catalog, or a
 * {@code Condition} helper is given an invalid argument: a rule wildcarded on
 * both action and subject that carries a Conditions element, an unregistered
 * or unkeyed dynamic Action/Subject, one Action/Subject registered under two
 * catalog keys, or a field getter that isn't a method reference.
 */
@StandardException
public class PolicyArgumentException extends IllegalArgumentException {
}
