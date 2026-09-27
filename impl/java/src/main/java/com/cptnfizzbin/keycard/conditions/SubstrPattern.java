package com.cptnfizzbin.keycard.conditions;

import java.util.regex.Pattern;

/**
 * A parsed {@code $substr} pattern: {@code *} matches any run of characters,
 * a leading {@code ^} or trailing {@code $} anchors the match, and a
 * backslash escapes the next character (a trailing backslash is ignored). An
 * unanchored pattern matches anywhere in the subject.
 */
final class SubstrPattern {
    private final Pattern compiled;

    private SubstrPattern(Pattern compiled) {
        this.compiled = compiled;
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
