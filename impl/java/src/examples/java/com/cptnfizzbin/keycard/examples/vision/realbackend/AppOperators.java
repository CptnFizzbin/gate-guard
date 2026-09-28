package com.cptnfizzbin.keycard.examples.vision.realbackend;

import com.cptnfizzbin.keycard.conditions.ConditionOperator;
import com.cptnfizzbin.keycard.conditions.OperatorCatalog;

import java.time.Duration;
import java.time.Instant;

public class AppOperators {
    public static final OperatorCatalog catalog = new OperatorCatalog();

    /** {@code $withinDays}: true when the subject's Instant field is no more than {@code days} whole days before now (future instants also match). */
    public static ConditionOperator WithinDays = catalog.set("$withinDays", (subjectValue, days) ->
        Duration.between((Instant) subjectValue, Instant.now()).toDays() <= ((Number) days).longValue());
}
