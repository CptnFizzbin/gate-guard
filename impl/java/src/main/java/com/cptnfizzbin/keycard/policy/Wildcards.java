package com.cptnfizzbin.keycard.policy;

/** Wildcard-token resolution and matching for {@link Policy} and {@code PolicyBuilder}. */
public final class Wildcards {
    private Wildcards() {
    }

    private static final WildcardToken.Named DEFAULT_WILDCARD = new WildcardToken.Named("_ANY_");

    /** Returns {@code declared}, or the {@code "_ANY_"} default when it is {@code null} (undeclared). */
    public static WildcardToken orDefault(WildcardToken declared) {
        return declared != null ? declared : DEFAULT_WILDCARD;
    }

    /**
     * Returns the action wildcard token in effect: the {@code "_ANY_"}
     * default when {@code meta.anyAction} is undeclared, otherwise the
     * declared {@link WildcardToken}.
     */
    public static WildcardToken effectiveAnyAction(PolicyDefinition.Meta meta) {
        return orDefault(meta != null ? meta.anyAction() : null);
    }

    /** Returns the subject wildcard token in effect, symmetric with {@link #effectiveAnyAction}. */
    public static WildcardToken effectiveAnySubject(PolicyDefinition.Meta meta) {
        return orDefault(meta != null ? meta.anySubject() : null);
    }

    /** Returns {@code true} when {@code value} equals {@code ruleValue}, or {@code ruleValue} is the (non-disabled) wildcard token {@code any}. */
    public static boolean matches(String value, String ruleValue, WildcardToken any) {
        if (value.equals(ruleValue)) return true;
        return any instanceof WildcardToken.Named named && ruleValue.equals(named.token());
    }
}
