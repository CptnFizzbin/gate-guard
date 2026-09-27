package com.cptnfizzbin.keycard.conditions;

/**
 * A single {@code $}-prefixed condition operator. Built-in and custom
 * operators share this type and are registered and dispatched identically;
 * each receives an {@link OperatorContext} for evaluating nested conditions.
 */
public interface Operator {
    /** The {@code $}-prefixed name this operator is registered under (e.g. {@code "$eq"}, {@code "$hasRole"}). */
    String name();

    /**
     * Returns whether {@code subject} satisfies this operator with operand
     * {@code value}. {@code ctx} evaluates nested conditions via
     * {@link OperatorContext#resolveSubcondition}, as a custom
     * {@code $and}/{@code $or}-style operator would need.
     */
    boolean resolve(Object subject, Object value, OperatorContext ctx);

    /** Builds an {@code Operator} from a name and a {@link Resolver}. */
    static Operator of(String name, Resolver resolver) {
        return new Operator() {
            @Override
            public String name() {
                return name;
            }

            @Override
            public boolean resolve(Object subject, Object value, OperatorContext ctx) {
                return resolver.resolve(subject, value, ctx);
            }
        };
    }

    @FunctionalInterface
    interface Resolver {
        boolean resolve(Object subject, Object value, OperatorContext ctx);
    }
}
