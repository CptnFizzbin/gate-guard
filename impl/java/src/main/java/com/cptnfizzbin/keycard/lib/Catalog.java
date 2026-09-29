package com.cptnfizzbin.keycard.lib;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import com.cptnfizzbin.keycard.errors.PolicyArgumentException;

/**
 * Resolves an action/subject catalog into the names it serializes as,
 * including a dynamic Action/Subject's catalog key in place of its random name.
 */
public final class Catalog {
    private Catalog() {}

    /**
     * @param reverseMap raw name (e.g. a dynamic Action/Subject's random id) ->
     *   catalog key
     * @param names every catalog key, in registration order
     */
    public record Resolution(Map<String, String> reverseMap, List<String> names) {}

    /**
     * Resolves {@code catalog} into a {@link Resolution}.
     *
     * @param catalog keyed vocabulary, each key becoming its entry's
     *   serialized name; may be {@code null}
     * @param nameOf reads an entry's own (possibly random) name
     * @param kind names the vocabulary ("action"/"subject") in error messages
     * @throws PolicyArgumentException if one entry is registered under more
     *   than one key
     */
    public static <T> Resolution build(Map<String, ? extends T> catalog, Function<T, String> nameOf, String kind) {
        List<String> names = new ArrayList<>();
        Map<String, String> reverseMap = new LinkedHashMap<>();
        if (catalog != null) {
            for (Map.Entry<String, ? extends T> entry : catalog.entrySet()) {
                String key = entry.getKey();
                String rawName = nameOf.apply(entry.getValue());
                String existingKey = reverseMap.get(rawName);
                if (existingKey != null && !existingKey.equals(key)) {
                    throw new PolicyArgumentException(
                        "KeycardConfig " + kind + " catalog error: the same " + kind + " is registered under both \""
                            + existingKey + "\" and \"" + key
                            + "\" - a single Action/Subject can only be registered under one catalog key."
                    );
                }
                reverseMap.put(rawName, key);
                names.add(key);
            }
        }

        return new Resolution(reverseMap, names);
    }

    public static String resolveName(Map<String, String> reverseMap, String rawName) {
        String resolved = reverseMap.get(rawName);
        return resolved != null ? resolved : rawName;
    }
}
