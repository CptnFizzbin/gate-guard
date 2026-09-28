package com.cptnfizzbin.keycard.policy;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;

/** Writes a {@link WildcardToken} as its raw scalar (the token string, or {@code null} when disabled) so a {@link PolicyDefinition} round-trips unchanged. */
final class WildcardTokenSerializer extends JsonSerializer<WildcardToken> {
    @Override
    public void serialize(WildcardToken value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value instanceof WildcardToken.Named named) {
            gen.writeString(named.token());
        } else {
            gen.writeNull();
        }
    }
}
