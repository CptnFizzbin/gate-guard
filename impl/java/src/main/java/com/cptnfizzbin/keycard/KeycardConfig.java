package com.cptnfizzbin.keycard;


import com.cptnfizzbin.keycard.action.Action;
import com.cptnfizzbin.keycard.action.ActionCatalog;
import com.cptnfizzbin.keycard.conditions.OperatorCatalog;
import com.cptnfizzbin.keycard.policy.WildcardToken;
import com.cptnfizzbin.keycard.subject.Subject;
import com.cptnfizzbin.keycard.subject.SubjectCatalog;
import lombok.AccessLevel;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.jspecify.annotations.Nullable;

import java.lang.System.Logger;

@Data
@Accessors(fluent = true, chain = true)
public class KeycardConfig {
    private Logger logger = System.getLogger("Keycard");

    private ActionCatalog actions = new ActionCatalog();
    private SubjectCatalog subjects = new SubjectCatalog();

    private OperatorCatalog operators = new OperatorCatalog();

    /**
     * When {@code true} (the default), {@link com.cptnfizzbin.keycard.builder.PolicyBuilder}
     * and {@link com.cptnfizzbin.keycard.policy.Policy} run fail-fast catalog
     * checks at construction - a dynamic Action/Subject used but never
     * registered, or a loaded definition not satisfying its own
     * {@code meta.actions}/{@code meta.subjects}/{@code meta.operators} - and
     * {@code PolicyBuilder#buildDef()} attaches the derived {@code meta} block.
     * Set {@code false} to skip both, e.g. in production once CI has run the
     * checks.
     */
    private boolean emitMeta = true;

    /**
     * Reserved for embedding and running a policy's shared, cross-language
     * test cases (the {@code tests} block); has no effect.
     */
    // TODO: wire emitTests up to the policy's tests block
    private boolean emitTests = false;

    /**
     * The action wildcard token: {@code null} when never configured (so a
     * built {@code meta.anyAction} stays undeclared), or
     * {@link WildcardToken.Disabled} when disabled via {@code anyAction(null)}.
     */
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private WildcardToken anyAction = null;

    /** The subject wildcard token, symmetric with {@link #anyAction}. */
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private WildcardToken anySubject = null;

    public WildcardToken anyAction() {
        return this.anyAction;
    }

    public KeycardConfig anyAction(@Nullable Action action) {
        this.anyAction = action != null ? new WildcardToken.Named(action.name()) : new WildcardToken.Disabled();
        return this;
    }

    public WildcardToken anySubject() {
        return this.anySubject;
    }

    public KeycardConfig anySubject(@Nullable Subject<?, ?> subject) {
        this.anySubject = subject != null ? new WildcardToken.Named(subject.name()) : new WildcardToken.Disabled();
        return this;
    }
}
