package com.cptnfizzbin.keycard.policy;

import com.cptnfizzbin.keycard.errors.PolicyLoadException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Test;

import java.util.List;
import java.util.Map;

import static org.junit.Assert.*;

/**
 * Covers binding {@link PolicyDefinition}/{@link PolicyDefinition.Rule}/
 * {@link PolicyDefinition.Meta} to and from JSON with a plain
 * {@link ObjectMapper}, including the {@code anyAction}/{@code anySubject}
 * "not declared" vs. "declared null" distinction.
 */
public class PolicyDefinitionJacksonTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    public void deserializesADocumentDirectlyIntoAPolicyDefinition() throws Exception {
        String json = """
            {
              "version": "0.1",
              "name": "Test Policy",
              "meta": { "anyAction": "ALL", "actions": ["Read", "Write"] },
              "rules": [
                ["allow", "Read", "Article"],
                ["deny", "Update", "Article", { "status": "archived" }]
              ]
            }
            """;

        PolicyDefinition definition = MAPPER.readValue(json, PolicyDefinition.class);

        assertEquals("0.1", definition.version());
        assertEquals("Test Policy", definition.name());
        assertEquals(new WildcardToken.Named("ALL"), definition.meta().anyAction());
        assertEquals(List.of("Read", "Write"), definition.meta().actions());

        List<PolicyDefinition.Rule> rules = definition.rules();
        assertEquals(2, rules.size());

        assertEquals("allow", rules.get(0).effect());
        assertEquals("Read", rules.get(0).action());
        assertEquals("Article", rules.get(0).subjectName());
        assertNull(rules.get(0).conditions());

        assertEquals("deny", rules.get(1).effect());
        assertEquals("Update", rules.get(1).action());
        assertEquals("Article", rules.get(1).subjectName());
        assertEquals(Map.of("status", "archived"), rules.get(1).conditions());
    }

    @Test
    public void anyActionAbsentLeavesTheFieldUndeclared() throws Exception {
        PolicyDefinition.Meta meta = MAPPER.readValue("{}", PolicyDefinition.Meta.class);
        assertNull(meta.anyAction());
    }

    @Test
    public void anyActionExplicitNullDisablesTheWildcard() throws Exception {
        PolicyDefinition.Meta meta = MAPPER.readValue("{\"anyAction\": null}", PolicyDefinition.Meta.class);
        assertEquals(new WildcardToken.Disabled(), meta.anyAction());
    }

    @Test
    public void anyActionFalseDisablesTheWildcard() throws Exception {
        PolicyDefinition.Meta meta = MAPPER.readValue("{\"anyAction\": false}", PolicyDefinition.Meta.class);
        assertEquals(new WildcardToken.Disabled(), meta.anyAction());
    }

    @Test
    public void anyActionTrueIsRejected() {
        Exception thrown = assertThrows(Exception.class, () ->
            MAPPER.readValue("{\"anyAction\": true}", PolicyDefinition.Meta.class));

        Throwable cause = thrown;
        while (cause != null && !(cause instanceof PolicyLoadException)) {
            cause = cause.getCause();
        }
        assertNotNull("expected a PolicyLoadException in the failure's cause chain", cause);
    }

    @Test
    public void aPolicyDefinitionRoundTripsThroughSerializeThenDeserialize() throws Exception {
        PolicyDefinition original = new PolicyDefinition()
            .version("0.1")
            .name("Round Trip")
            .meta(new PolicyDefinition.Meta().anyAction("ALL_ACTIONS"))
            .rules(List.of(
                new PolicyDefinition.Rule("allow", "Read", "Article"),
                new PolicyDefinition.Rule("deny", "Update", "Article", Map.of("status", "archived"))
            ));

        String json = MAPPER.writeValueAsString(original);
        PolicyDefinition roundTripped = MAPPER.readValue(json, PolicyDefinition.class);

        assertEquals(original.version(), roundTripped.version());
        assertEquals(original.name(), roundTripped.name());
        assertEquals(original.meta().anyAction(), roundTripped.meta().anyAction());
        // "not declared" survives the round trip too, rather than coming back "declared null".
        assertNull(roundTripped.meta().anySubject());

        assertEquals(original.rules().size(), roundTripped.rules().size());
        for (int i = 0; i < original.rules().size(); i++) {
            PolicyDefinition.Rule expected = original.rules().get(i);
            PolicyDefinition.Rule actual = roundTripped.rules().get(i);
            assertEquals(expected.effect(), actual.effect());
            assertEquals(expected.action(), actual.action());
            assertEquals(expected.subjectName(), actual.subjectName());
            assertEquals(expected.conditions(), actual.conditions());
        }
    }
}
