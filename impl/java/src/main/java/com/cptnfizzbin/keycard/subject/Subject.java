package com.cptnfizzbin.keycard.subject;


import lombok.Getter;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.Optional;
import java.util.UUID;

/**
 * A named subject - the Subject position of a rule - optionally wrapping
 * claims for a rule's conditions to inspect. The no-arg constructor creates a
 * dynamic Subject whose name is a random id, which must be registered under a
 * catalog key before use.
 * <p>
 * {@code TSelf} is a self-bound type (as with {@code Enum<E extends Enum<E>>})
 * so {@link #wrap} returns the real subtype without a cast. A dedicated
 * subclass (recommended) overrides {@link #copy} to call its own
 * {@code (Subject, Claims)} constructor:
 * <pre>{@code
 * class ArticleSubject extends Subject<ArticleSubject.Claims, ArticleSubject> {
 *     ArticleSubject() {
 *         super("article");
 *     }
 *
 *     private ArticleSubject(Subject<Claims, ArticleSubject> prev, Claims instance) {
 *         super(prev, instance);
 *     }
 *
 *     @Override
 *     protected ArticleSubject copy(Claims instance) {
 *         return new ArticleSubject(this, instance);
 *     }
 * }
 * }</pre>
 */
@Getter
@Accessors(fluent = true)
public class Subject<T, TSelf extends Subject<T, TSelf>> {
    private final String id;
    private final String name;
    private final Boolean dynamic;

    @Nullable
    private final T claims;

    public Optional<T> claims() {
        return Optional.ofNullable(claims);
    }

    public Subject() {
        this.id = UUID.randomUUID().toString();
        this.name = this.id;
        this.dynamic = true;
        this.claims = null;
    }

    public Subject(String name) {
        this.id = UUID.randomUUID().toString();
        this.name = name;
        this.dynamic = false;
        this.claims = null;
    }

    protected Subject(Subject<T, TSelf> prev, @Nullable T instance) {
        this.id = prev.id;
        this.name = prev.name;
        this.dynamic = prev.dynamic;
        this.claims = instance;
    }

    public TSelf wrap(@NotNull T claims) {
        return copy(claims);
    }

    /**
     * Returns a copy of this Subject with {@code instance} as its claims,
     * preserving id/name/dynamic. A dedicated subclass overrides it to return
     * its own type - see the class doc.
     */
    @SuppressWarnings("unchecked")
    protected TSelf copy(@Nullable T instance) {
        return (TSelf) new Subject<>(this, instance);
    }
}
