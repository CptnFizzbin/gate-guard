package com.cptnfizzbin.keycard.policy;

public final class Wildcards {
    private Wildcards() {
    }

    private static final WildcardToken.Named DEFAULT_WILDCARD = new WildcardToken.Named("_ANY_");

    public static WildcardToken orDefault(WildcardToken declared) {
        return declared != null ? declared : DEFAULT_WILDCARD;
    }

    public static WildcardToken effectiveAnyAction(PolicyDefinition.Meta meta) {
        return orDefault(meta != null ? meta.anyAction() : null);
    }

    public static WildcardToken effectiveAnySubject(PolicyDefinition.Meta meta) {
        return orDefault(meta != null ? meta.anySubject() : null);
    }

    public static boolean matches(String value, String ruleValue, WildcardToken any) {
        if (value.equals(ruleValue)) return true;
        return any instanceof WildcardToken.Named named && ruleValue.equals(named.token());
    }
}
