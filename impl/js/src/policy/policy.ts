import * as semver from "semver"

import type { PolicyDefinition, RuleTuple } from "./policyDefinition.ts"
import { DISABLED, effectiveAnyAction, effectiveAnySubject } from "./wildcards.ts"
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
  private readonly warnedDynamicIds = new Set<string>()

  /**
   * @param config shared with `PolicyBuilder` - see `KeycardConfig`
   * @throws PolicyVersionException if `definition.version` is not supported
   * @throws PolicyLoadException if a rule is malformed or not covered by the
   *   declared catalogs, a `meta.operators` entry has no registered operator,
   *   or two operators share a name
   * @throws PolicyArgumentError if `emitMeta` is true and one Action/Subject is
   *   registered under two catalog keys
   */
  constructor(
    definition: PolicyDefinition,
    config: KeycardConfig<TOperators> = {},
  ) {
    Policy.validateVersion(definition.version)

    const emitMeta = config.emitMeta ?? true
    const actions = buildCatalog(config.actions, "action", emitMeta)
    const subjects = buildCatalog(config.subjects, "subject", emitMeta)

    this.definition = definition
    this.config = config
    this.actionCatalog = actions.reverseMap
    this.subjectCatalog = subjects.reverseMap
    this.resolver = new ConditionResolver(normalizeOperators(config.operators))
    if (emitMeta) Policy.validateOperatorsRegistered(definition, this.resolver)
    Policy.validateRules(definition, actions.names, subjects.names, emitMeta)
  }

  /**
   * Equivalent to `new Policy(definition, config)`. KeyCard never parses policy
   * text; parse YAML/JSON into a `PolicyDefinition` yourself.
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

  private static validateVersion(version: string): void {
    // PATCH (and MINOR) may be omitted - "1"/"1.0" are valid
    // shorthand for "1.0.0" - so coerce before comparing rather than
    // requiring a strict three-component string.
    const coerced = semver.coerce(version)
    if (!coerced || !semver.satisfies(coerced, KEYCARD_POLICY_SUPPORTED_VERSIONS)) {
      throw new PolicyVersionException(
        `Unsupported policy version "${coerced}": this implementation supports ${KEYCARD_POLICY_SUPPORTED_VERSIONS}.`,
      )
    }
  }

  /**
   * Throws a `PolicyLoadException` if `meta.operators` lists a name that isn't
   * registered on `resolver` (built-in or custom), whether or not any rule
   * uses it.
   */
  private static validateOperatorsRegistered(definition: PolicyDefinition, resolver: ConditionResolver): void {
    const declared = definition.meta?.operators
    if (!declared) return

    resolver.assertAllRegistered(declared)
  }

  /**
   * @param emitMeta when false, only the catalog-coverage checks are skipped;
   *   the structural checks always run, since evaluation depends on them
   */
  private static validateRules(
    definition: PolicyDefinition,
    configActionNames: string[],
    configSubjectNames: string[],
    emitMeta: boolean,
  ): void {
    const meta = definition.meta
    const anyAction = effectiveAnyAction(meta)
    const anySubject = effectiveAnySubject(meta)

    const actionsCatalog = emitMeta && (meta?.actions || configActionNames.length > 0)
      ? new Set([...(meta?.actions ?? []), ...configActionNames])
      : undefined
    const subjectsCatalog = emitMeta && (meta?.subjects || configSubjectNames.length > 0)
      ? new Set([...(meta?.subjects ?? []), ...configSubjectNames])
      : undefined
    const operatorsCatalog = emitMeta && meta?.operators ? new Set(meta.operators) : undefined

    for (const rule of definition.rules as RuleTuple[]) {
      if (!Array.isArray(rule) || rule.length < 3) {
        throw new PolicyLoadException(
          `Malformed rule tuple (fewer than 3 elements): ${JSON.stringify(rule)}.`,
        )
      }

      const [effect, action, subjectName, conditions] = rule

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

      const isWildcardAction = anyAction !== DISABLED && action === anyAction
      const isWildcardSubject = anySubject !== DISABLED && subjectName === anySubject

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

  def(): PolicyDefinition {
    return this.definition
  }

  /**
   * Returns whether `action` is allowed on `subject`: the last-declared rule
   * whose action, subject, and conditions all match decides, and no match
   * means deny. There is no "allow AND NOT deny" veto. A bare subject (no
   * `.wrap()`) never matches a conditional rule.
   */
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

  private checkPermission(action: TActions, subject: TSubjects): boolean {
    const meta = this.definition.meta
    const anyAction = effectiveAnyAction(meta)
    const anySubject = effectiveAnySubject(meta)
    const rules = this.definition.rules

    for (let i = rules.length - 1; i >= 0; i--) {
      const [effect, ruleAction, ruleSubject, ruleConditions] = rules[i]

      if (!this.matchesAction(action, ruleAction, anyAction)) continue
      if (!this.matchesSubject(subject, ruleSubject, anySubject)) continue

      if (ruleConditions) {
        // A bare check has no instance for the conditions to inspect; without
        // this guard, a condition such as { x: { $ne: 1 } } would match it.
        if (subject.instance === undefined) continue
        if (!this.resolver.evaluate(subject.instance, ruleConditions, this.resolveFieldMapper(subject))) continue
        return effect === "allow"
      }

      return effect === "allow"
    }

    return false
  }

  private resolveFieldMapper(subject: TSubjects): SubjectFieldMapper<unknown> | undefined {
    if (subject.fieldMapper) return subject.fieldMapper as SubjectFieldMapper<unknown>
    return this.config.mapper?.get(resolveName(this.subjectCatalog, subject.name))
  }

  private matchesAction(action: TActions, ruleAction: string, anyAction: string | typeof DISABLED): boolean {
    this.warnIfUnregisteredDynamic(action, this.actionCatalog, "Action", "createAction")
    const actionName = resolveName(this.actionCatalog, action.name)
    return actionName === ruleAction || (anyAction !== DISABLED && ruleAction === anyAction)
  }

  private matchesSubject(subject: TSubjects, ruleSubject: string, anySubject: string | typeof DISABLED): boolean {
    this.warnIfUnregisteredDynamic(subject, this.subjectCatalog, "Subject", "createSubject")
    const subjectName = resolveName(this.subjectCatalog, subject.name)
    return subjectName === ruleSubject || (anySubject !== DISABLED && ruleSubject === anySubject)
  }

  private warnIfUnregisteredDynamic(
    value: { name: string, __dynamic?: true },
    reverseMap: Map<string, string>,
    kind: string,
    factory: string,
  ): void {
    // An unregistered dynamic value can never match a non-wildcard rule, and
    // would otherwise fall through to default deny silently.
    if (!value.__dynamic || reverseMap.has(value.name) || this.warnedDynamicIds.has(value.name)) return
    this.warnedDynamicIds.add(value.name)
    ;(this.config.logger ?? getLogger()).warn(
      `${kind} created via ${factory}() with no name was checked but never registered in any KeycardConfig catalog reachable from this Policy - it can never match a non-wildcard rule.`,
    )
  }
}
