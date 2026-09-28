package com.cptnfizzbin.keycard.policy;

import com.cptnfizzbin.keycard.action.Action;
import com.cptnfizzbin.keycard.subject.Subject;
import com.cptnfizzbin.keycard.version.KeyCardVersion;
import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.*;
import lombok.experimental.Accessors;
import org.jspecify.annotations.Nullable;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The PolicyDefinition document shape, Jackson-annotated so a document can be
 * bound to and from any format a Jackson format module supports (YAML, JSON,
 * ...). KeyCard itself never reads or writes policy text; the consumer picks
 * the format module.
 */
@Data
@Accessors(fluent = true, chain = true)
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public final class PolicyDefinition {
    /**
     * Required SemVer string, e.g. "1.0.0".
     */
    @JsonProperty("version")
    private String version = KeyCardVersion.KEYCARD_POLICY_VERSION.toString();
    /**
     * Informational only - plays no role in evaluation.
     */
    @JsonProperty("name")
    private String name = null;
    /**
     * Informational only - plays no role in evaluation.
     */
    @JsonProperty("description")
    private String description = null;
    @JsonProperty("meta")
    private Meta meta = null;
    @JsonProperty("rules")
    private List<Rule> rules = new ArrayList<>();

    /**
     * Returns an immutable snapshot of the rules. Lombok's fluent
     * {@code rules()} returns the live, mutable list; {@code Policy} relies on
     * this snapshot so later edits to the definition can't bypass validation.
     */
    public List<Rule> getRules() {
        return List.copyOf(rules);
    }

    @Data
    @Accessors(fluent = true, chain = true)
    @NoArgsConstructor
    @ToString
    @EqualsAndHashCode
    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static final class Meta {
        @JsonProperty("anyAction")
        @JsonDeserialize(using = WildcardTokenDeserializer.class)
        @JsonSerialize(using = WildcardTokenSerializer.class)
        private WildcardToken anyAction = null;

        @JsonProperty("anySubject")
        @JsonDeserialize(using = WildcardTokenDeserializer.class)
        @JsonSerialize(using = WildcardTokenSerializer.class)
        private WildcardToken anySubject = null;

        @JsonProperty("actions")
        private List<String> actions = null;

        @JsonProperty("subjects")
        private List<String> subjects = null;

        @JsonProperty("operators")
        private List<String> operators = null;

        @JsonProperty("application")
        private Object application = null;

        public Meta anySubject(@Nullable Subject<?, ?> subject) {
            return subject != null
                ? anySubject(subject.name())
                : anySubject(false);
        }

        public Meta anySubject(String value) {
            this.anySubject = new WildcardToken.Named(value);
            return this;
        }

        public Meta anySubject(boolean enabled) {
            this.anySubject = enabled ? new WildcardToken.Named("_ANY_") : new WildcardToken.Disabled();
            return this;
        }

        public Meta anySubject(@Nullable WildcardToken token) {
            this.anySubject = token;
            return this;
        }

        public Meta anyAction(@Nullable Action action) {
            return action != null
                ? anyAction(action.name())
                : anyAction(false);
        }

        public Meta anyAction(String value) {
            this.anyAction = new WildcardToken.Named(value);
            return this;
        }

        public Meta anyAction(boolean enabled) {
            this.anyAction = enabled ? new WildcardToken.Named("_ANY_") : new WildcardToken.Disabled();
            return this;
        }

        public Meta anyAction(@Nullable WildcardToken token) {
            this.anyAction = token;
            return this;
        }
    }

    /**
     * A rule tuple, {@code [Effect, Action, Subject, Conditions?]}, serialized
     * positionally as an array. Declaration order within {@code rules} is
     * significant.
     */
    @Getter
    @Accessors(fluent = true)
    @JsonFormat(shape = JsonFormat.Shape.ARRAY)
    public static final class Rule {
        /**
         * MUST be "allow" or "deny" - anything else is a malformed rule tuple.
         */
        @JsonProperty("effect")
        private final String effect;
        @JsonProperty("action")
        private final String action;
        @JsonProperty("subjectName")
        private final String subjectName;

        /**
         * Nullable - a rule with no conditions is unconditional.
         */
        @JsonProperty("conditions")
        private final Map<String, Object> conditions;

        public Rule(String effect, String action, String subjectName) {
            this.effect = effect;
            this.action = action;
            this.subjectName = subjectName;
            this.conditions = null;
        }

        @JsonCreator
        public Rule(
            @JsonProperty("effect") String effect,
            @JsonProperty("action") String action,
            @JsonProperty("subjectName") String subjectName,
            @JsonProperty("conditions") Map<String, Object> conditions
        ) {
            this.effect = effect;
            this.action = action;
            this.subjectName = subjectName;
            this.conditions = conditions;
        }
    }
}
