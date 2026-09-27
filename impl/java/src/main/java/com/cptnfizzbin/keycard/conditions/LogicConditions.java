package com.cptnfizzbin.keycard.conditions;

import java.util.List;

/**
 * Combining logic for {@code $or}/{@code $and}/{@code $not} over an
 * already-validated operand; callers type-check it and log any diagnostic. An
 * empty list is {@code false} for {@link #or} and {@code true} for
 * {@link #and}.
 */
public final class LogicConditions {
    private LogicConditions() {}

    public static boolean or(OperatorContext ctx, Object subject, List<?> conditions) {
        for (Object cond : conditions) {
            if (ctx.resolveSubcondition(subject, cond)) {
                return true;
            }
        }
        return false;
    }

    public static boolean and(OperatorContext ctx, Object subject, List<?> conditions) {
        for (Object cond : conditions) {
            if (!ctx.resolveSubcondition(subject, cond)) {
                return false;
            }
        }
        return true;
    }

    public static boolean not(OperatorContext ctx, Object subject, Object condition) {
        return !ctx.resolveSubcondition(subject, condition);
    }
}
