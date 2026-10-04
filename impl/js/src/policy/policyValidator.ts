import * as semver from "semver"

import { PolicyLoadException, PolicyVersionException } from "../errors/index.ts"
import type { KeycardConfig } from "../keycardConfig.ts"
import type { Meta, PolicyDefinition, RuleTuple } from "./policyDefinition.ts"
import { isEffect } from "./policyDefinition.ts"
import type { AnyOperator } from "../conditions/operators/operator.ts"
import { KeycardContext } from "../keycardContext.ts"
import { collectOperators } from "../lib/conditionUtils.ts"
import type { JsonArray, JsonObject, JsonValue } from "../lib/json.ts"
import { KEYCARD_POLICY_SUPPORTED_VERSIONS } from "../version.ts"

const createErrorFactory = (ruleIndex: number, rule: unknown) => {
  return (msg: string) => {
    return new PolicyLoadException(
      `Rule ${ruleIndex}: ${JSON.stringify(rule)} - ${msg}`)
  }
}

export class PolicyValidator {
  private readonly ctx: KeycardContext

  constructor(config: KeycardContext | KeycardConfig<AnyOperator> = {}) {
    this.ctx = KeycardContext.from(config)

    this.validateRule = this.validateRule.bind(this)
  }

  public validate(policy: JsonObject): asserts policy is PolicyDefinition {
    this.validateEnvelope(policy)
    this.validateVersion(policy.version)

    if (policy.meta) {
      this.validateMeta(policy.meta)
    }

    policy.rules.forEach(this.validateRule)
  }

  public validateEnvelope(policy: JsonObject): asserts policy is PolicyDefinition {
    if (
      policy === null
      || typeof policy !== "object"
      || Array.isArray(policy)
    ) {
      throw new PolicyLoadException(`A PolicyDefinition must be an object, got ${JSON.stringify(policy)}.`)
    }

    const { rules, meta } = policy as Record<string, unknown>
    if (!Array.isArray(rules)) {
      throw new PolicyLoadException(
        `PolicyDefinition.rules must be an array, got ${JSON.stringify(
          rules)}.`)
    }
    if (meta !== undefined
      && (meta === null || typeof meta !== "object" || Array.isArray(meta))) {
      throw new PolicyLoadException(
        `PolicyDefinition.meta must be an object when present, got ${JSON.stringify(
          meta)}.`)
    }
  }

  public validateVersion(version: unknown): void {
    if (typeof version !== "string") {
      throw new PolicyVersionException(
        `Invalid policy version ${JSON.stringify(version)}: expected a string.`,
      )
    }

    const versionRegex = /^\d+\.\d+(\.\d+)?$/
    if (!versionRegex.test(version)) {
      throw new PolicyVersionException(
        `Invalid policy version "${version}": expected a Semantic Version with MAJOR and MINOR versions.`,
      )
    }

    const coerced = semver.coerce(version)
    if (!coerced) {
      throw new PolicyVersionException(
        `Invalid policy version "${version}": expected a Semantic Version.`,
      )
    }

    if (!semver.satisfies(coerced, KEYCARD_POLICY_SUPPORTED_VERSIONS)) {
      throw new PolicyVersionException(
        `Unsupported policy version "${version}". This library supports versions ${KEYCARD_POLICY_SUPPORTED_VERSIONS}.`,
      )
    }
  }

  public validateMeta(meta: JsonValue): asserts meta is Meta {
    if (
      !meta
      || Array.isArray(meta)
      || typeof meta !== "object"
    ) {
      throw new PolicyLoadException(`meta must be an object, got ${JSON.stringify(meta)}`)
    }

    if (meta.actions) {
      this.validateCatalogList(meta.actions, "meta.actions")
    }

    if (meta.subjects) {
      this.validateCatalogList(meta.subjects, "meta.subjects")
    }

    if (meta.operators) {
      this.validateCatalogList(meta.operators, "meta.operators")

      for (const name of meta.operators ?? []) {
        if (!name.startsWith("$")) {
          throw new PolicyLoadException(`meta.operators entry "${name}" must be a "$"-prefixed operator name.`)
        }
      }
    }
  }

  public validateRule(rule: JsonValue, ruleIndex: number): asserts rule is RuleTuple {
    const createError = createErrorFactory(ruleIndex, rule)

    if (!Array.isArray(rule))
      throw createError(`Rule must be an array`)

    if (!this.isRuleArray(rule))
      throw createError(`Malformed rule tuple (expected 3 or 4 elements)`)

    const [effect, action, subject, conditions] = rule

    if (!isEffect(effect))
      throw createError(`Malformed rule tuple: effect must be "allow" or "deny", got ${JSON.stringify(effect)}`)

    if (typeof action !== "string")
      throw createError(`Malformed rule tuple: action must be a string got ${JSON.stringify(action)}`)

    if (typeof subject !== "string")
      throw createError(`Malformed rule tuple: subject must be a string got ${JSON.stringify(subject)}`)

    const isWildcardAction = this.ctx.actions.isWildcard(action)
    const isWildcardSubject = this.ctx.subjects.isWildcard(subject)
    if (isWildcardAction && isWildcardSubject && conditions) {
      throw createError(`Illegal rule: Rule is any action and any subject but has conditions.`)
    }

    if (this.ctx.actions.size >= 1) {
      if (!this.ctx.actions.has(action)) {
        throw createError(`Unknown action "${action}"`)
      }
    }

    if (this.ctx.subjects.size >= 1) {
      if (!this.ctx.subjects.has(subject)) {
        throw createError(`Unknown subject "${subject}"`)
      }
    }

    if (conditions) {
      const operators = collectOperators(conditions)
      const knownOperators = new Set(this.ctx.operators.names())
      const unknown = operators.difference(knownOperators)
      if (unknown.size === 1) {
        throw createError(`Unknown operator "${[...unknown][0]}"`)
      } else if (unknown.size >= 1) {
        throw createError(`Unknown operators "${[...unknown]}"`)
      }
    }
  }

  public validateCatalogList(entries: JsonValue, field: string): asserts entries is string[] {
    if (
      !entries
      || !Array.isArray(entries)
      || !entries.every((action) => typeof action === "string")
    ) {
      throw new PolicyLoadException(`${field} must be an array of strings, got ${JSON.stringify(entries)}.`)
    }
  }

  private isRuleArray(rule: unknown): rule is JsonArray {
    return (
      Array.isArray(rule)
      && rule.length >= 3
      && rule.length <= 4
    )
  }
}
