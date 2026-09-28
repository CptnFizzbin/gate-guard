package com.cptnfizzbin.keycard.errors;

import lombok.experimental.StandardException;

/**
 * Thrown by {@code new Policy(...)} when a PolicyDefinition's {@code version}
 * is invalid or not supported by this implementation - a different MAJOR, or
 * a MINOR higher than it understands. {@code PATCH} never affects this
 * decision.
 */
@StandardException
public class PolicyVersionException extends RuntimeException {
}
