package com.cptnfizzbin.keycard.version;

import org.semver4j.Semver;
import org.semver4j.range.RangeList;
import org.semver4j.range.RangeListFactory;

import java.util.Objects;

public final class KeyCardVersion {
    private KeyCardVersion() {
    }

    /** The policy spec version stamped onto every PolicyDefinition this implementation creates. */
    public static final Semver KEYCARD_POLICY_VERSION = Objects.requireNonNull(Semver.coerce("0.1"));
    public static final RangeList KEYCARD_POLICY_SUPPORTED_VERSIONS = RangeListFactory.create("<=0.1.*");
}
