import * as semver from "semver"

import type { Meta, PolicyDefinition, RuleTuple } from "./policyDefinition.ts"
import type { DISABLED } from "./wildcards.ts"
import { effectiveAnyAction, effectiveAnySubject } from "./wildcards.ts"
import type { Action } from "../action/index.ts"
import type { AnyCondition } from "../conditions/condition.ts"
import { BUILTIN_OPERATOR_NAMES } from "../conditions/conditionResolver.ts"
import { ConditionResolver } from "../conditions/index.ts"
import type { AnyOperator } from "../conditions/operators/operator.ts"
import { normalizeOperators } from "../conditions/operators/operator.ts"
import { PolicyError, PolicyLoadException, PolicyVersionException } from "../errors/index.ts"
import type { KeycardConfig } from "../keycardConfig.ts"
import { buildCatalog, resolveName } from "../lib/catalog.ts"
import { getLogger } from "../lib/logger.ts"
import type { Subject } from "../subject/index.ts"
import type { SubjectFieldMapper } from "../subject/subjectFieldMapper.ts"
import { KEYCARD_POLICY_SUPPORTED_VERSIONS } from "../version.ts"

/**
 * `MAJOR[.MINOR[.PATCH]]`, optionally followed by SemVer pre-release/build
 * suffixes - PATCH (and MINOR) may be omitted, so `"0.1"` is valid
 * shorthand for `"0.1.0"`. Checked before handing the string to
 * `semver.coerce`, which on its own would happily pull a version out of
 * arbitrary text (`"banana 0.1 xyz"`).
 */
const VERSION_PATTERN = /^\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

/**
 * Recursively collects every non-built-in, `$`-prefixed operator name used
 * anywhere in a Conditions tree - used to enforce `meta.operators`
 * coverage when loading a policy.
 */
function collectCustomOperators(condition: AnyCondition | undefined, out: Set<string>): void {
  if (condition === undefined || condition === null || typeof condition !== "object") return

  for (const [key, value] of Object.entries(condition)) {
    if (key.startsWith("$")) {
      if (key === "$or" || key === "$and") {
        if (Array.isArray(value)) value.forEach((c: AnyCondition) => collectCustomOperators(c, out))
      } else if (key === "$not") {
        collectCustomOperators(value, out)
      } else if (key === "$field" && Array.isArray(value) && value.length === 2) {
        collectCustomOperators(value[1], out)
      } else if (!BUILTIN_OPERATOR_NAMES.has(key)) {
        out.add(key)
      }
    } else {
      collectCustomOperators(value, out)
    }
  }
}

/**
 * A copy of `definition` that shares no mutable structure with it - so
 * neither the caller's object (e.g. a `PolicyBuilder` that keeps adding
 * rules) nor a `def()` result can change an already-validated `Policy`.
 * `meta.application` is opaque application data, so it's carried over by
 * reference rather than cloned.
 */
function cloneDefinition(definition: PolicyDefinition): PolicyDefinition {
  const { meta, rules, ...rest } = definition
  const clone: PolicyDefinition = { ...rest, rules: rules.map((rule) => structuredClone(rule)) }
  if (meta) {
    const { application, ...metaRest } = meta
    clone.meta = structuredClone(metaRest)
    if ("application" in meta) clone.meta.application = application
  }
  return clone
}

/** Every entry of a declared `meta` catalog MUST be a string, and MUST be unique. */
function validateCatalog(entries: unknown, field: string): void {
  if (entries === undefined) return
  if (!Array.isArray(entries)) {
    throw new PolicyLoadException(`${field} must be an array of strings, got ${JSON.stringify(entries)}.`)
  }

  const seen = new Set<string>()
  for (const entry of entries) {
    if (typeof entry !== "string") {
      throw new PolicyLoadException(`${field} must only contain strings, got ${JSON.stringify(entry)}.`)
    }
    if (seen.has(entry)) {
      throw new PolicyLoadException(`${field} lists "${entry}" more than once - each entry MUST be unique.`)
    }
    seen.add(entry)
  }
}

export class Policy<
  TActions extends Action = Action,
  TSubjects extends Subject = Subject,
  TOperators extends AnyOperator = never,
> {
  private readonly definition: PolicyDefinition
  private readonly resolver: ConditionResolver
  private readonly config: KeycardConfig<TOperators>
  private readonly actionCatalog: Map<string, string>
  private readonly subjectCatalog: Map<string, string>
  private readonly anyAction: string | typeof DISABLED
  private readonly anySubject: string | typeof DISABLED
  private readonly warnedDynamicIds = new Set<string>()

  /**
   * @param definition validated, then copied - later changes to the object
   *   passed in never affect this Policy.
   * @param config shared, optional config also accepted by `PolicyBuilder`
   *   (and the SubjectFieldMapper feature): `actions`/`subjects`
   *   widen the `meta.actions`/`meta.subjects` catalogs beyond what
   *   `definition.meta` itself declares, and double as a catalog resolving
   *   a dynamic (no-name) Action/Subject's random name to its key, built
   *   once here and cached (see `lib/catalog.ts`); `operators` - an
   *   `AnyOperator[]` or an `OperatorCatalog` - is normalized once here;
   *   `mapper` is consulted for a subject's fields whenever the `Subject`
   *   passed to {@link can} doesn't carry its own `fieldMapper`; `logger`
   *   receives every diagnostic this Policy emits; `emitMeta` (default
   *   `true`) gates the eager catalog/operator validation below - see
   *   `KeycardConfig`'s doc.
   */
  constructor(
    definition: PolicyDefinition,
    config: KeycardConfig<TOperators> = {},
  ) {
    Policy.validateEnvelope(definition)
    Policy.validateVersion(definition.version)

    const emitMeta = config.emitMeta ?? true
    const actions = buildCatalog(config.actions, "action", emitMeta)
    const subjects = buildCatalog(config.subjects, "subject", emitMeta)

    this.definition = cloneDefinition(definition)
    this.config = config
    this.actionCatalog = actions.reverseMap
    this.subjectCatalog = subjects.reverseMap
    this.anyAction = effectiveAnyAction(this.definition.meta)
    this.anySubject = effectiveAnySubject(this.definition.meta)
    this.resolver = new ConditionResolver(normalizeOperators(config.operators), config.logger)

    Policy.validateMeta(this.definition.meta)
    if (emitMeta) Policy.validateOperatorsRegistered(this.definition, this.resolver)
    this.validateRules(actions.names, subjects.names, emitMeta)
  }

  /**
   * Builds a Policy from an already-parsed PolicyDefinition. KeyCard itself
   * never reads or writes policy.yaml text - an application (or a test, via
   * a YAML library of its own choosing) parses the file into a plain
   * PolicyDefinition object and hands it to KeyCard.
   */
  static from<
    TActions extends Action = Action,
    TSubjects extends Subject = Subject,
    TOperators extends AnyOperator = never,
  >(
    definition: PolicyDefinition,
    config: KeycardConfig<TOperators> = {},
  ): Policy<TActions, TSubjects, TOperators> {
    return new Policy(definition, config)
  }

  /**
   * The document-level shape checks - a definition that's not an object,
   * a missing/non-array `rules`, or a non-object `meta` is structurally
   * invalid, and MUST surface as a {@link PolicyLoadException} rather than
   * whatever `TypeError` the first property access would otherwise throw.
   */
  private static validateEnvelope(definition: unknown): asserts definition is PolicyDefinition {
    if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
      throw new PolicyLoadException(`A PolicyDefinition must be an object, got ${JSON.stringify(definition)}.`)
    }

    const { rules, meta } = definition as Record<string, unknown>
    if (!Array.isArray(rules)) {
      throw new PolicyLoadException(`PolicyDefinition.rules must be an array, got ${JSON.stringify(rules)}.`)
    }
    if (meta !== undefined && (meta === null || typeof meta !== "object" || Array.isArray(meta))) {
      throw new PolicyLoadException(`PolicyDefinition.meta must be an object when present, got ${JSON.stringify(meta)}.`)
    }
  }

  private static validateVersion(version: unknown): void {
    if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
      throw new PolicyVersionException(
        `Invalid policy version ${JSON.stringify(version)}: expected a SemVer string such as "0.1" or "0.1.0".`,
      )
    }

    // PATCH (and MINOR) may be omitted - "0"/"0.1" are valid shorthand
    // for "0.0.0"/"0.1.0" - so coerce before comparing rather than
    // requiring a strict three-component string.
    const coerced = semver.coerce(version)
    if (!coerced || !semver.satisfies(coerced, KEYCARD_POLICY_SUPPORTED_VERSIONS)) {
      throw new PolicyVersionException(
        `Unsupported policy version "${version}": this implementation supports ${KEYCARD_POLICY_SUPPORTED_VERSIONS}.`,
      )
    }
  }

  /**
   * The `meta` catalogs' own shape: each declared catalog is an array of
   * unique strings, and every `meta.operators` entry names a custom
   * (`$`-prefixed, non-built-in) operator. Always run, regardless of
   * `emitMeta` - these guard the document's validity, not diagnostics.
   */
  private static validateMeta(meta: Meta | undefined): void {
    if (!meta) return

    validateCatalog(meta.actions, "meta.actions")
    validateCatalog(meta.subjects, "meta.subjects")
    validateCatalog(meta.operators, "meta.operators")

    for (const name of meta.operators ?? []) {
      if (!name.startsWith("$")) {
        throw new PolicyLoadException(`meta.operators entry "${name}" must be a "$"-prefixed operator name.`)
      }
      if (BUILTIN_OPERATOR_NAMES.has(name)) {
        throw new PolicyLoadException(`meta.operators MUST NOT list the built-in operator "${name}".`)
      }
    }
  }

  /**
   * when `meta.operators` is declared, every
   * name it lists MUST already be registered on this Policy - built-in or
   * custom - checked once here when loading a policy, regardless of
   * whether any rule actually reaches that operator during evaluation.
   * Only run when `emitMeta` is true - see `KeycardConfig.emitMeta`'s doc.
   */
  private static validateOperatorsRegistered(definition: PolicyDefinition, resolver: ConditionResolver): void {
    const declared = definition.meta?.operators
    if (!declared) return

    resolver.assertAllRegistered(declared)
  }

  /**
   * @param configActionNames/@param configSubjectNames resolved catalog names (see `lib/catalog.ts`) that, when given, widen the `meta.actions`/`meta.subjects` catalogs below beyond what `definition.meta` declares.
   * @param emitMeta when false, skips only the catalog-coverage checks
   *   below (a rule action/subject/operator not covered by
   *   `meta.actions`/`meta.subjects`/`meta.operators`) - the structural
   *   checks (malformed rule tuples, both-sides-wildcarded rules with conditions) always run regardless, since
   *   those guard evaluation correctness rather than diagnostics.
   */
  private validateRules(
    configActionNames: string[],
    configSubjectNames: string[],
    emitMeta: boolean,
  ): void {
    const meta = this.definition.meta
    const { anyAction, anySubject } = this

    const actionsCatalog = emitMeta && (meta?.actions || configActionNames.length > 0)
      ? new Set([...(meta?.actions ?? []), ...configActionNames])
      : undefined
    const subjectsCatalog = emitMeta && (meta?.subjects || configSubjectNames.length > 0)
      ? new Set([...(meta?.subjects ?? []), ...configSubjectNames])
      : undefined
    const operatorsCatalog = emitMeta && meta?.operators ? new Set(meta.operators) : undefined

    for (const rule of this.definition.rules as unknown[]) {
      if (!Array.isArray(rule) || rule.length < 3 || rule.length > 4) {
        throw new PolicyLoadException(
          `Malformed rule tuple (expected 3 or 4 elements): ${JSON.stringify(rule)}.`,
        )
      }

      const [effect, action, subjectName, conditions] = rule as RuleTuple

      if (effect !== "allow" && effect !== "deny") {
        throw new PolicyLoadException(
          `Malformed rule tuple: effect must be "allow" or "deny", got ${JSON.stringify(effect)}.`,
        )
      }
      if (typeof action !== "string") {
        throw new PolicyLoadException(
          `Malformed rule tuple: action must be a string, got ${JSON.stringify(action)}.`,
        )
      }
      if (typeof subjectName !== "string") {
        throw new PolicyLoadException(
          `Malformed rule tuple: subject must be a string, got ${JSON.stringify(subjectName)}.`,
        )
      }

      const isWildcardAction = action === anyAction
      const isWildcardSubject = subjectName === anySubject

      if (isWildcardAction && isWildcardSubject && conditions) {
        throw new PolicyLoadException(
          `Rule [${effect}, ${action}, ${subjectName}] is wildcarded on both the action and the subject but carries a Conditions element - this MUST be unconditional.`,
        )
      }

      if (actionsCatalog && !isWildcardAction && !actionsCatalog.has(action)) {
        throw new PolicyLoadException(
          `Rule action "${action}" is not covered by meta.actions.`,
        )
      }
      if (subjectsCatalog && !isWildcardSubject && !subjectsCatalog.has(subjectName)) {
        throw new PolicyLoadException(
          `Rule subject "${subjectName}" is not covered by meta.subjects.`,
        )
      }

      if (operatorsCatalog && conditions) {
        const used = new Set<string>()
        collectCustomOperators(conditions, used)
        for (const op of used) {
          if (!operatorsCatalog.has(op)) {
            throw new PolicyLoadException(
              `Rule uses custom operator "${op}" not covered by meta.operators.`,
            )
          }
        }
      }
    }
  }

  /**
   * The definition this Policy was constructed from, preserving its own
   * `version`. Returns a fresh copy on every call, so mutating the result
   * never affects this Policy.
   */
  def(): PolicyDefinition {
    return cloneDefinition(this.definition)
  }

  can(action: TActions, subject: TSubjects): boolean {
    return this.checkPermission(action, subject)
  }

  cannot(action: TActions, subject: TSubjects): boolean {
    return !this.can(action, subject)
  }

  require(action: TActions, subject: TSubjects): void {
    if (!this.can(action, subject)) {
      const actionName = resolveName(this.actionCatalog, action.name)
      const subjectName = resolveName(this.subjectCatalog, subject.name)
      throw new PolicyError(`"${actionName}" is not allowed on this "${subjectName}"`)
    }
  }

  /**
   * Reverse scan over `rules`, returning the effect of
   * the first (i.e. most-recently-declared) rule whose action, subject,
   * and (if present) conditions all match. There is no independent
   * "allow AND NOT deny" veto and no combination of multiple matching
   * rules: exactly one rule decides the outcome, or none does and the
   * result is default deny. The incoming action/subject names are resolved
   * once per check, not once per rule.
   */
  private checkPermission(action: TActions, subject: TSubjects): boolean {
    this.warnIfUnregisteredDynamic(action, this.actionCatalog, "Action", "createAction")
    this.warnIfUnregisteredDynamic(subject, this.subjectCatalog, "Subject", "createSubject")

    const actionName = resolveName(this.actionCatalog, action.name)
    const subjectName = resolveName(this.subjectCatalog, subject.name)
    const { anyAction, anySubject } = this
    const rules = this.definition.rules

    for (let i = rules.length - 1; i >= 0; i--) {
      const [effect, ruleAction, ruleSubject, ruleConditions] = rules[i]

      if (ruleAction !== actionName && ruleAction !== anyAction) continue
      if (ruleSubject !== subjectName && ruleSubject !== anySubject) continue

      if (ruleConditions) {
        // A conditional rule can never be satisfied by a bare-type/no-instance
        // check - there's no instance data for the condition to inspect.
        if (subject.instance === undefined) continue
        if (!this.resolver.evaluate(subject.instance, ruleConditions, this.resolveFieldMapper(subject))) continue
      }

      return effect === "allow"
    }

    return false // Default deny.
  }

  /** The subject's own `fieldMapper` (set via `createSubject`) takes precedence; `config.mapper`, keyed by the subject's resolved catalog name, is the fallback. */
  private resolveFieldMapper(subject: TSubjects): SubjectFieldMapper<unknown> | undefined {
    if (subject.fieldMapper) return subject.fieldMapper as SubjectFieldMapper<unknown>
    return this.config.mapper?.get(resolveName(this.subjectCatalog, subject.name))
  }

  /**
   * A dynamic (no-name) Action/Subject never registered in any catalog
   * reachable from this Policy can't resolve to a real name - it falls
   * through to default-deny like any other non-match (unless a wildcard
   * rule catches it), but that's silent otherwise, so warn once per
   * distinct id rather than once per `.can()`/`.cannot()`/`.require()` call.
   */
  private warnIfUnregisteredDynamic(
    value: { name: string, __dynamic?: true },
    reverseMap: Map<string, string>,
    kind: string,
    factory: string,
  ): void {
    if (!value.__dynamic || reverseMap.has(value.name) || this.warnedDynamicIds.has(value.name)) return
    this.warnedDynamicIds.add(value.name)
    ;(this.config.logger ?? getLogger()).warn(
      `${kind} created via ${factory}() with no name was checked but never registered in any KeycardConfig catalog reachable from this Policy - it can never match a non-wildcard rule.`,
    )
  }
}
