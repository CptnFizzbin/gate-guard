import type { AnyCondition } from "../conditions/condition.ts"
import type { JsonArray, JsonObject, JsonValue } from "../lib/json.ts"

/** A rule's effect - allow it, or deny it. */
export type Effect = "allow" | "deny"

export const isEffect = (effect: unknown): effect is Effect => {
  return (
    typeof effect === "string"
    && (
      effect === "allow"
      || effect === "deny"
    )
  )
}

/**
 * `[Effect, Action, Subject, Conditions?]`, with Action and Subject as plain
 * name strings, since `PolicyDefinition` is the JSON-serializable wire format
 * shared across languages. A three-element tuple is an unconditional rule.
 */
export type RuleTuple =
  | [Effect, string, string]
  | [Effect, string, string, AnyCondition]

/** The optional `meta` object, grouping six independent, all-optional fields. */
export interface Meta extends JsonObject {
  /**
   * The action wildcard token. Absent -> defaults to
   * `"_ANY_"`. Explicit `null` or `false` -> disables the action wildcard entirely
   * (no string, including `"_ANY_"`, has special meaning).
   */
  anyAction?: string | false | null
  /** The subject wildcard token, symmetric with `anyAction` in every respect. */
  anySubject?: string | false | null
  /** Declared action vocabulary; when present, enforced at construction. */
  actions?: string[]
  /** Declared subject vocabulary; when present, enforced at construction. */
  subjects?: string[]
  /** Declared custom `$`-operator vocabulary; when present, enforced at construction. */
  operators?: string[]
  /** Opaque application data - never validated, enforced, or cross-checked. */
  application?: JsonValue
}

/** The `PolicyDefinition` document shape. */
export interface PolicyDefinition extends JsonObject {
  /** Required SemVer string, e.g. `"1.0.0"`. */
  version: string
  /** Informational only - plays no role in evaluation. */
  name?: string
  /** Informational only - plays no role in evaluation. */
  description?: string

  meta?: Meta

  /** Ordered; declaration order is significant. MAY be empty. */
  rules: RuleTuple[]

  tests?: JsonArray
}
