package com.cptnfizzbin.keycard.subject;

import com.cptnfizzbin.keycard.errors.PolicyArgumentException;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A {@code key -> Subject} catalog. Each key is the name its Subject
 * serializes as: {@link #add(Subject)} keys a Subject by its own name, and
 * {@link #add(String, Subject)} gives an explicit key, which a dynamic Subject
 * requires.
 */
public final class SubjectCatalog {
    private final Map<String, Subject<?, ?>> entries = new LinkedHashMap<>();

    /**
     * Registers {@code subject} under {@code name}; registering the same Subject
     * under the same key again is a no-op.
     *
     * @throws PolicyArgumentException if a different Subject is already registered under {@code name}
     */
    public SubjectCatalog add(String name, Subject<?, ?> subject) {
        Subject<?, ?> existing = entries.putIfAbsent(name, subject);
        if (existing != null && existing != subject) {
            throw new PolicyArgumentException(
                "SubjectCatalog already has a different Subject registered under \"" + name + "\"."
            );
        }
        return this;
    }

    public SubjectCatalog add(Subject<?, ?> subject) {
        if (subject.dynamic())
            throw new PolicyArgumentException("Dynamic subjects must be added to the catalog with a name");
        return this.add(subject.name(), subject);
    }

    /**
     * Registers {@code subject} under the explicit key {@code name} and
     * returns {@code subject} itself (its real, possibly subclassed type) -
     * so a dedicated Subject subclass can be declared and registered in one
     * line: {@code static ProjectSubject Project = catalog.set("project", new ProjectSubject());}
     */
    public <S extends Subject<?, ?>> S set(String name, S subject) {
        this.add(name, subject);
        return subject;
    }

    /**
     * Registers {@code subject} under its own name and returns it.
     *
     * @throws PolicyArgumentException if {@code subject} is dynamic
     */
    public <S extends Subject<?, ?>> S set(S subject) {
        this.add(subject);
        return subject;
    }

    /** The Subject registered under {@code name}, or {@code null}. */
    public Subject<?, ?> get(String name) {
        return entries.get(name);
    }

    public boolean contains(String name) {
        return entries.containsKey(name);
    }

    /** A read-only, insertion-ordered view of every {@code key -> Subject} registration. */
    public Map<String, Subject<?, ?>> asMap() {
        return Collections.unmodifiableMap(entries);
    }
}
