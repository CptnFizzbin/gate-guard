package com.cptnfizzbin.keycard.integration;

import com.cptnfizzbin.keycard.action.Action;
import com.cptnfizzbin.keycard.policy.Policy;
import com.cptnfizzbin.keycard.subject.Subject;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.semver4j.Semver;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/** Format-independent helpers for fixture-driven integration suites. */
final class FixtureUtils {
    private FixtureUtils() {
    }

    static final YAMLMapper YAML = YAMLMapper.builder()
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .build();

    /** One {@code { action, subject, subjectData?, expected }} case, common to every fixture format. */
    public record TestCase(String name, String action, String subject, Map<String, Object> subjectData,
                           boolean expected) {
    }

    static List<Path> discoverYamlFiles(Path dir, Predicate<Path> filter) throws IOException {
        try (var stream = Files.walk(dir)) {
            return stream
                .filter(Files::isRegularFile)
                .filter(p -> p.getFileName().toString().endsWith(".yaml"))
                .filter(filter)
                .sorted()
                .collect(Collectors.toList());
        }
    }

    static <T> List<T> loadYamlDocuments(Path yamlFile, Class<T> type) throws IOException {
        try (var parser = YAML.createParser(yamlFile.toFile())) {
            return YAML.readValues(parser, type).readAll();
        }
    }

    static boolean resolve(Policy policy, TestCase testCase) {
        Action action = new Action(testCase.action());
        Subject<Map<String, Object>, ?> subject = new Subject<>(testCase.subject());
        if (testCase.subjectData() != null) {
            subject = subject.wrap(testCase.subjectData());
        }
        return policy.can(action, subject);
    }

    static boolean isCompatible(String fixtureVersion, String maxSupportedVersion) {
        Semver fixture = Objects.requireNonNull(Semver.coerce(fixtureVersion));
        Semver max = Objects.requireNonNull(Semver.coerce(maxSupportedVersion));
        return fixture.getMajor() == max.getMajor() && fixture.getMinor() <= max.getMinor();
    }

    /**
     * System property that overrides a suite's baked-in
     * {@code compliantVersion} for one run, e.g.
     * {@code mvn test -Dkeycard.fixtures.maxVersion=1.0.0}. When unset, the
     * suite's own version applies.
     */
    static final String MAX_VERSION_PROPERTY = "keycard.fixtures.maxVersion";

    /**
     * Returns {@code true} when a fixture declaring {@code fixtureVersion}
     * should run against a suite whose adapter targets {@code compliantVersion}
     * (or {@link #MAX_VERSION_PROPERTY}, when set), so fixtures for a newer
     * MINOR are skipped until the adapter catches up.
     */
    static boolean isIncluded(String fixtureVersion, String compliantVersion) {
        String override = System.getProperty(MAX_VERSION_PROPERTY);
        return isCompatible(fixtureVersion, override != null ? override : compliantVersion);
    }
}
