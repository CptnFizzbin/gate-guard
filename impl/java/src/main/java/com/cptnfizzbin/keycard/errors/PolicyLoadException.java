package com.cptnfizzbin.keycard.errors;

import lombok.experimental.StandardException;

/**
 * Thrown when loading an invalid policy or operator set: a malformed rule
 * tuple or wildcard declaration, a both-sides-wildcarded rule carrying a
 * Conditions element, a rule referencing an action/subject/custom-operator
 * name outside a declared {@code meta} catalog, a {@code meta.operators} entry
 * with no registered operator, or two operators sharing a name.
 */
@StandardException
public class PolicyLoadException extends RuntimeException {
}
