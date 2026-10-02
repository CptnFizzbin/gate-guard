package com.cptnfizzbin.keycard;


import com.cptnfizzbin.keycard.action.Action;
import com.cptnfizzbin.keycard.action.ActionCatalog;
import com.cptnfizzbin.keycard.builder.PolicyBuilder;
import com.cptnfizzbin.keycard.conditions.OperatorCatalog;
import com.cptnfizzbin.keycard.policy.WildcardToken;
import com.cptnfizzbin.keycard.subject.Subject;
import com.cptnfizzbin.keycard.subject.SubjectCatalog;
import com.cptnfizzbin.keycard.errors.PolicyArgumentException;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

import java.lang.System.Logger;

/**
 * Mutable, shared configuration for {@link PolicyBuilder} and {@code Policy}.
 * {@code PolicyBuilder} and {@code Policy} read the {@code actions}/{@code subjects}
 * catalogs once, when constructed; entries added afterwards aren't seen by them.
 */
@Getter
@Setter
@Accessors(fluent = true, chain = true)
public class KeycardConfig {
    /** Where type-issue diagnostics from condition evaluation are reported (at {@code ERROR}). */
    private Logger logger = System.getLogger("Keycard");

    private ActionCatalog actions = new ActionCatalog();
    private SubjectCatalog subjects = new SubjectCatalog();

    private OperatorCatalog operators = new OperatorCatalog();

    /**
     * When {@code true} (the default), {@code PolicyBuilder}'s {@code allow()}/{@code deny()} reject an
     * unregistered dynamic Action/Subject, {@code Policy}'s constructor rejects a definition that doesn't satisfy
     * its own {@code meta.actions}/{@code meta.subjects}/{@code meta.operators}, and {@code PolicyBuilder#buildDef()}
     * attaches the derived {@code meta.actions}/{@code meta.subjects}/{@code meta.operators}. A configured
     * {@code anyAction}/{@code anySubject} is emitted as {@code meta.anyAction}/{@code meta.anySubject} either
     * way, since evaluation depends on it. Structural rule checks (a malformed rule tuple, a conditional
     * both-sides-wildcarded rule) run either way.
     */
    private boolean emitMeta = true;

    // TODO: implement emitTests - when true, PolicyBuilder#buildDef() should
    // emit a tests block of shared, cross-language cases, and Policy should be
    // able to run the cases a loaded definition carries
    /**
     * Reserved for embedding and running a policy's shared, cross-language
     * test cases (the {@code tests} block); has no effect.
     */
    private boolean emitTests = false;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private WildcardToken anyAction = null;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private WildcardToken anySubject = null;

    /**
     * The action wildcard token: {@code null} when never configured (a built
     * {@code meta.anyAction} stays undeclared), or {@link WildcardToken.Disabled}
     * after {@link #disableAnyAction()}.
     */
    public WildcardToken anyAction() {
        return this.anyAction;
    }

    /** Declares {@code action}'s name as the action wildcard token. */
    public KeycardConfig anyAction(Action action) {
        if (action == null) {
            throw new PolicyArgumentException("anyAction(null): use disableAnyAction() to disable the action wildcard.");
        }
        this.anyAction = new WildcardToken.Named(action.name());
        return this;
    }

    /** Disables the action wildcard - no action name, including {@code "_ANY_"}, has special meaning. */
    public KeycardConfig disableAnyAction() {
        this.anyAction = WildcardToken.DISABLED;
        return this;
    }

    public WildcardToken anySubject() {
        return this.anySubject;
    }

    /** Declares {@code subject}'s name as the subject wildcard token. */
    public KeycardConfig anySubject(Subject<?, ?> subject) {
        if (subject == null) {
            throw new PolicyArgumentException("anySubject(null): use disableAnySubject() to disable the subject wildcard.");
        }
        this.anySubject = new WildcardToken.Named(subject.name());
        return this;
    }

    /** Disables the subject wildcard - no subject name, including {@code "_ANY_"}, has special meaning. */
    public KeycardConfig disableAnySubject() {
        this.anySubject = WildcardToken.DISABLED;
        return this;
    }
}
