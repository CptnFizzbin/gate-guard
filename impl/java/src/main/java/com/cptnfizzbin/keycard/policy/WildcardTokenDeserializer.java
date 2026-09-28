package com.cptnfizzbin.keycard.policy;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;

/**
 * Binds a raw {@code anyAction}/{@code anySubject} value to a
 * {@link WildcardToken} via {@link WildcardToken#of}. An explicit {@code null}
 * disables the wildcard; an absent property leaves the field {@code null}
 * (undeclared).
 */
final class WildcardTokenDeserializer extends JsonDeserializer<WildcardToken> {
    @Override
    public WildcardToken deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        return WildcardToken.of(p.readValueAs(Object.class));
    }

    // Jackson calls this only for an explicit null, never for an absent
    // property, which keeps "declared null" distinct from "undeclared".
    @Override
    public WildcardToken getNullValue(DeserializationContext ctxt) {
        return WildcardToken.of(null);
    }
}
