package com.cptnfizzbin.keycard.lib;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import com.cptnfizzbin.keycard.errors.PolicyArgumentException;

/**
 * Resolves action/subject vocabularies into the names they serialize as,
 * including a dynamic Action/Subject's catalog key in place of its random name.
 */
public final class Catalog {
    private Catalog() {}

    /**
     * @param reverseMap raw name (e.g. a dynamic Action/Subject's random id) ->
     *   catalog key; empty when no keyed catalog was given
     * @param names every resolved name: a list entry's own name, or a catalog
     *   entry's key
     */
    public record Resolution(Map<String, String> reverseMap, List<String> names) {}

    /**
     * Resolves {@code list} and {@code catalog} into a {@link Resolution}.
     *
     * @param list vocabulary declared by name only, each entry's own name
     *   used as-is; may be {@code null}
     * @param catalog keyed vocabulary, each key becoming its entry's
     *   serialized name; may be {@code null}
     * @param nameOf reads an entry's own (possibly random) name
     * @param kind names the vocabulary ("action"/"subject") in error messages
     * @throws PolicyArgumentException if one entry is registered under more
     *   than one key
     */
    public static <T> Resolution build(List<T> list, Map<String, T> catalog, Function<T, String> nameOf, String kind) {
        List<String> names = new ArrayList<>();
        if (list != null) {
            for (T entry : list) names.add(nameOf.apply(entry));
        }

        Map<String, String> reverseMap = new LinkedHashMap<>();
        if (catalog != null) {
            for (Map.Entry<String, T> entry : catalog.entrySet()) {
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

    /** Resolves {@code rawName} (an Action/Subject's own name, dynamic or not) to its catalog key, or returns it unchanged when it isn't a registered catalog entry. */
    public static String resolveName(Map<String, String> reverseMap, String rawName) {
        String resolved = reverseMap.get(rawName);
        return resolved != null ? resolved : rawName;
    }
}
