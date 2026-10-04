import * as semver from "semver"

import { PolicyLoadException, PolicyVersionException } from "../errors/index.ts"
import type { KeycardConfig } from "../keycardConfig.ts"
import type { Meta, PolicyDefinition, RuleTuple } from "./policyDefinition.ts"
import { isEffect } from "./policyDefinition.ts"
import { BUILTIN_OPERATOR_NAMES } from "../conditions/operators/defaultOperators.ts"
import type { AnyOperator } from "../conditions/operators/operator.ts"
import { KeycardContext } from "../keycardContext.ts"
import { collectOperators } from "../lib/conditionUtils.ts"
import type { JsonArray, JsonObject, JsonValue } from "../lib/json.ts"
import { KEYCARD_POLICY_SUPPORTED_VERSIONS } from "../version.ts"
import { effectiveAnyAction, effectiveAnySubject } from "./wildcards.ts"

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
  }

  public validate(policy: JsonObject): asserts policy is PolicyDefinition {
    this.validateEnvelope(policy)
    this.validateVersion(policy.version)

    if (policy.meta !== undefined) {
      this.validateMeta(policy.meta)
    }

    this.validateOperatorsRegistered(policy.meta)
    policy.rules.forEach((rule, index) => this.validateRule(rule, index, policy.meta))
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

    effectiveAnyAction(meta)
    effectiveAnySubject(meta)

    if (meta.actions !== undefined) {
      this.validateCatalogList(meta.actions, "meta.actions")
    }

    if (meta.subjects !== undefined) {
      this.validateCatalogList(meta.subjects, "meta.subjects")
    }

    if (meta.operators !== undefined) {
      this.validateCatalogList(meta.operators, "meta.operators")

      for (const name of meta.operators) {
        if (!name.startsWith("$")) {
          throw new PolicyLoadException(`meta.operators entry "${name}" must be a "$"-prefixed operator name.`)
        }
        if (BUILTIN_OPERATOR_NAMES.has(name)) {
          throw new PolicyLoadException(`meta.operators MUST NOT list the built-in operator "${name}".`)
        }
      }
    }
  }

  public validateRule(rule: JsonValue, ruleIndex: number, meta?: Meta): asserts rule is RuleTuple {
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

    const isWildcardAction = action === effectiveAnyAction(meta)
    const isWildcardSubject = subject === effectiveAnySubject(meta)
    if (isWildcardAction && isWildcardSubject && conditions) {
      throw createError(`Illegal rule: Rule is any action and any subject but has conditions.`)
    }

    // Skipped with emitMeta: false, which opts out of catalog coverage but
    // not of the structural checks above.
    if (!this.ctx.emitMeta) return

    const actionsCatalog = this.catalogOf(meta?.actions, this.ctx.actions.names())
    if (actionsCatalog && !isWildcardAction && !actionsCatalog.has(action)) {
      throw createError(`Action "${action}" is not covered by meta.actions.`)
    }

    const subjectsCatalog = this.catalogOf(meta?.subjects, this.ctx.subjects.names())
    if (subjectsCatalog && !isWildcardSubject && !subjectsCatalog.has(subject)) {
      throw createError(`Subject "${subject}" is not covered by meta.subjects.`)
    }

    if (conditions && meta?.operators) {
      const declared = new Set(meta.operators)
      for (const operator of collectOperators(conditions)) {
        if (!BUILTIN_OPERATOR_NAMES.has(operator) && !declared.has(operator)) {
          throw createError(`Custom operator "${operator}" is not covered by meta.operators.`)
        }
      }
    }
  }

  /** Throws unless every `meta.operators` entry is registered, whether or not a rule uses it. */
  private validateOperatorsRegistered(meta: Meta | undefined): void {
    if (!this.ctx.emitMeta || !meta?.operators) return

    for (const name of meta.operators) {
      if (!this.ctx.operators.has(name)) {
        throw new PolicyLoadException(
          `meta.operators declares "${name}" but no operator with that name is registered.`,
        )
      }
    }
  }

  /** The union of a declared `meta` catalog and the config's, or `undefined` when neither declares one. */
  private catalogOf(declared: string[] | undefined, configured: Set<string>): Set<string> | undefined {
    if (!declared && configured.size === 0) return undefined
    return new Set([...(declared ?? []), ...configured])
  }

  public validateCatalogList(entries: JsonValue, field: string): asserts entries is string[] {
    if (
      !Array.isArray(entries)
      || !entries.every((action) => typeof action === "string")
    ) {
      throw new PolicyLoadException(`${field} must be an array of strings, got ${JSON.stringify(entries)}.`)
    }

    const seen = new Set<string>()
    for (const entry of entries) {
      if (seen.has(entry)) {
        throw new PolicyLoadException(`${field} lists "${entry}" more than once - each entry MUST be unique.`)
      }
      seen.add(entry)
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
