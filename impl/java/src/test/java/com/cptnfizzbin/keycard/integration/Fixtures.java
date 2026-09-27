package com.cptnfizzbin.keycard.integration;

import com.cptnfizzbin.keycard.conditions.Operator;
import com.cptnfizzbin.keycard.policy.PolicyDefinition;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Loads the shared, spec-derived conformance fixtures under test/fixtures
 * (see the README there) that every implementation MUST pass. Not a test
 * class itself - see {@link ConformanceFixtureTest}.
 */
final class Fixtures {
    private Fixtures() {
    }

    static final Path FIXTURES_DIR = Paths.get("../../test/fixtures");

    /** Returns every {@code *.yaml} fixture file under test/fixtures, sorted by path. */
    static List<Path> discoverFixtureFiles() throws IOException {
        return FixtureUtils.discoverYamlFiles(FIXTURES_DIR, p -> true);
    }

    /**
     * Returns the custom operators the fixture file {@code fixtureFileName}
     * needs. Only the host application (here, this test suite) can implement
     * a custom operator; a fixture's meta.operators only declares it.
     */
    static List<Operator> operatorsFor(String fixtureFileName) {
        if ("11-worked-example.yaml".equals(fixtureFileName)) {
            // Mirrors the spec Appendix's own suggested implementation:
            // "one that checks subject.roles.includes('admin')".
            return List.of(Operator.of("$hasRole", (subject, value, ctx) -> {
                if (!(subject instanceof Map)) return false;
                Object roles = ((Map<?, ?>) subject).get("roles");
                return roles instanceof List && ((List<?>) roles).contains(value);
            }));
        }
        if ("policy-05-advanced.yaml".equals(fixtureFileName)) {
            // A custom operator checking whether a field's string value starts with an uppercase letter.
            return List.of(Operator.of("$startsWithUpper", (subject, value, ctx) -> {
                if (!(subject instanceof String) || !(value instanceof Boolean) || ((String) subject).isEmpty()) {
                    return false;
                }
                char first = ((String) subject).charAt(0);
                boolean isUpper = Character.toUpperCase(first) == first;
                return isUpper == (Boolean) value;
            }));
        }
        return List.of();
    }

    /** One {@code ---}-separated fixture document: its policy definition and test cases. */
    public record Suite(PolicyDefinition definition, List<FixtureUtils.TestCase> cases) {
    }

    /** The {@code check: [action, subject, subjectData?]} tuple of a {@code tests:} entry, bound positionally. */
    @JsonFormat(shape = JsonFormat.Shape.ARRAY)
    record CheckDoc(String action, String subject, Map<String, Object> subjectData) {
    }

    record TestDoc(String name, CheckDoc check, Boolean expected) {
    }

    /** A fixture document's {@code tests:} list, which {@link PolicyDefinition} has no field for. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record TestsDoc(List<TestDoc> tests) {
    }

    static List<Suite> loadSuites(Path yamlFile) throws IOException {
        // Each document is read twice - once as a PolicyDefinition, once for its
        // tests - since Jackson (as of 2.17) can't combine @JsonUnwrapped with a
        // record/constructor-based property.
        List<PolicyDefinition> definitions = FixtureUtils.loadYamlDocuments(yamlFile, PolicyDefinition.class);
        List<TestsDoc> testsDocs = FixtureUtils.loadYamlDocuments(yamlFile, TestsDoc.class);

        List<Suite> suites = new ArrayList<>();
        for (int i = 0; i < definitions.size(); i++) {
            List<FixtureUtils.TestCase> cases = new ArrayList<>();
            for (TestDoc test : testsDocs.get(i).tests()) {
                cases.add(new FixtureUtils.TestCase(
                    test.name(),
                    test.check().action(),
                    test.check().subject(),
                    test.check().subjectData(),
                    test.expected()
                ));
            }

            suites.add(new Suite(definitions.get(i), cases));
        }

        return suites;
    }
}
