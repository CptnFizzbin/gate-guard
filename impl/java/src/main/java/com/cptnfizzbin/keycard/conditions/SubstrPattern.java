package com.cptnfizzbin.keycard.conditions;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/** A parsed {@code $substr} pattern (syntax: see {@link Condition#substr}); a trailing backslash is ignored. */
final class SubstrPattern {
    private final Pattern compiled;

    private static final int CACHE_SIZE = 256;

    // Bounded (LRU) because patterns built from per-request data could otherwise
    // grow it without limit; Optional.empty() caches a malformed pattern.
    private static final Map<String, Optional<SubstrPattern>> CACHE = Collections.synchronizedMap(
        new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Optional<SubstrPattern>> eldest) {
                return size() > CACHE_SIZE;
            }
        }
    );

    private SubstrPattern(Pattern compiled) {
        this.compiled = compiled;
    }

    /** Same as {@link #parse}, but memoized. */
    static SubstrPattern cached(String raw) {
        return CACHE.computeIfAbsent(raw, r -> Optional.ofNullable(parse(r))).orElse(null);
    }

    /**
     * Returns the parsed pattern, or {@code null} if it is structurally
     * invalid: an unescaped {@code ^} anywhere but first, or an unescaped
     * {@code $} anywhere but last.
     */
    static SubstrPattern parse(String raw) {
        StringBuilder regex = new StringBuilder();
        int n = raw.length();

        for (int i = 0; i < n; i++) {
            char c = raw.charAt(i);

            switch (c) {
                case '\\':
                    if (i + 1 >= n) break;
                    regex.append(Pattern.quote(String.valueOf(raw.charAt(i + 1))));
                    i++;
                    break;
                case '*':
                    regex.append(".*");
                    break;
                case '^':
                    if (i != 0) return null;
                    regex.append('^');
                    break;
                case '$':
                    if (i != n - 1) return null;
                    regex.append('$');
                    break;
                default:
                    regex.append(Pattern.quote(String.valueOf(c)));
            }
        }

        // DOTALL so "." (from ".*") truly means "any character".
        return new SubstrPattern(Pattern.compile(regex.toString(), Pattern.DOTALL));
    }

    boolean matches(String subject) {
        return compiled.matcher(subject).find();
    }
}
