import type { Action } from "../action/index.ts"
import type { AnyCondition } from "../conditions/condition.ts"
import type { Condition } from "../conditions/index.ts"
import type { AnyOperator, InferCondition } from "../conditions/operators/operator.ts"
import { assertOperatorName, normalizeOperators } from "../conditions/operators/operator.ts"
import { PolicyArgumentError } from "../errors/index.ts"
import type { KeycardConfig } from "../keycardConfig.ts"
import { buildCatalog, resolveName } from "../lib/catalog.ts"
import { Policy } from "../policy/policy.ts"
import type { Effect, Meta, PolicyDefinition, RuleTuple } from "../policy/policyDefinition.ts"
import { DEFAULT_WILDCARD, DISABLED, effectiveAnyAction, effectiveAnySubject } from "../policy/wildcards.ts"
import type { Subject } from "../subject/index.ts"
import { KEYCARD_POLICY_VERSION } from "../version.ts"

export const BUILDER_VERSION = KEYCARD_POLICY_VERSION

function wildcardNameOf(
  value: Action | Subject | string | false | undefined | null,
  reverseMap: Map<string, string>,
): string | false | null {
  if (value === null || value === false) return value
  if (typeof value === "undefined") return DEFAULT_WILDCARD
  if (typeof value === "string") return value
  return resolveName(reverseMap, value.name)
}

/**
 * Builds a {@link PolicyDefinition} rule by rule. {@link buildDef} derives
 * `meta.actions`/`meta.subjects`/`meta.operators` from what {@link allow}/
 * {@link deny} used and what `operators` registered, so there is no
 * hand-maintained catalog to keep in sync. `config.actions`/`config.subjects`
 * declare additional vocabulary up front; `config.anyAction`/`config.anySubject`
 * declare the wildcard tokens, which can't be inferred from usage.
 */
export class PolicyBuilder<
  TActions extends Action = Action,
  TSubjects extends Subject = Subject,
  TOperators extends AnyOperator = never,
> {
  private readonly rules: RuleTuple[] = []
  private readonly anyAction: string | false | null
  private readonly anySubject: string | false | null
  private readonly operators: AnyOperator[]
  private readonly actionsUsed = new Set<string>()
  private readonly subjectsUsed = new Set<string>()
  private readonly config: KeycardConfig<TOperators>
  private readonly emitMeta: boolean
  private readonly actionCatalog: Map<string, string>
  private readonly subjectCatalog: Map<string, string>
  private readonly configActionNames: string[]
  private readonly configSubjectNames: string[]

  /**
   * @param config shared with `Policy` - see `KeycardConfig`
   * @throws PolicyArgumentError if `emitMeta` is true and one Action/Subject is
   *   registered under two catalog keys
   */
  constructor(config: KeycardConfig<TOperators> = {}) {
    this.emitMeta = config.emitMeta ?? true

    const actions = buildCatalog(config.actions, "action", this.emitMeta)
    const subjects = buildCatalog(config.subjects, "subject", this.emitMeta)
    this.actionCatalog = actions.reverseMap
    this.subjectCatalog = subjects.reverseMap
    this.configActionNames = actions.names
    this.configSubjectNames = subjects.names

    this.anyAction = wildcardNameOf(config.anyAction, this.actionCatalog)
    this.anySubject = wildcardNameOf(config.anySubject, this.subjectCatalog)
    this.config = config
    this.operators = normalizeOperators(config.operators)
    this.operators.forEach((op) => assertOperatorName(op.name))
  }

  allow<TAction extends TActions, TSubject extends TSubjects>(
    actions: TAction | TActions[],
    subject: TSubject,
    conditions?: Condition<
      TSubject extends Subject<infer TData> ? TData : never,
      InferCondition<TOperators>
    >,
  ): this {
    if (!Array.isArray(actions)) return this.allow([actions], subject, conditions)

    for (const action of actions) {
      this.addRule("allow", action, subject, conditions)
    }

    return this
  }

  deny<TAction extends TActions, TSubject extends TSubjects>(
    actions: TAction | TActions[],
    subject: TSubject,
    conditions?: Condition<
      TSubject extends Subject<infer TData> ? TData : never,
      InferCondition<TOperators>
    >,
  ): this {
    if (!Array.isArray(actions)) return this.deny([actions], subject, conditions)

    for (const action of actions) {
      this.addRule("deny", action, subject, conditions)
    }

    return this
  }

  build(): Policy<TActions, TSubjects, TOperators> {
    return new Policy(this.buildDef(), this.config)
  }

  /**
   * Returns the `PolicyDefinition` built so far.
   *
   * @param options.includeMeta when `false`, omits the whole `meta` block -
   *   including a non-default `anyAction`/`anySubject`, so the definition then
   *   evaluates with the default `"_ANY_"` wildcards
   */
  buildDef(options: { includeMeta?: boolean } = {}): PolicyDefinition {
    const def: PolicyDefinition = {
      version: BUILDER_VERSION,
      meta: {}, // Reserves meta's position ahead of rules, so serialized JSON lists it first
      // A copy, so later allow()/deny() calls can't change an already-built
      // definition or a Policy built from it (#50).
      rules: this.rules.map((rule) => structuredClone(rule)),
    }

    if (options.includeMeta ?? true) {
      def.meta = this.buildMeta()
    } else {
      delete def.meta
    }

    return def
  }

  private buildMeta(): Meta {
    const meta: Meta = {}
    if (this.anyAction !== DEFAULT_WILDCARD) meta.anyAction = this.anyAction
    if (this.anySubject !== DEFAULT_WILDCARD) meta.anySubject = this.anySubject

    if (this.emitMeta) {
      meta.actions = Array.from(new Set([...this.actionsUsed, ...this.configActionNames]))
      meta.subjects = Array.from(new Set([...this.subjectsUsed, ...this.configSubjectNames]))
      if (this.operators.length > 0) meta.operators = this.operators.map((op) => op.name)
    }

    return meta
  }

  private addRule(effect: Effect, action: TActions, subject: TSubjects, conditions?: AnyCondition): this {
    if (this.emitMeta && action.__dynamic && !this.actionCatalog.has(action.name)) {
      throw new PolicyArgumentError(
        `This Action was created via createAction() with no name and must be registered as a catalog value on the KeycardConfig handed to this PolicyBuilder before use.`,
      )
    }
    if (this.emitMeta && subject.__dynamic && !this.subjectCatalog.has(subject.name)) {
      throw new PolicyArgumentError(
        `This Subject was created via createSubject() with no name and must be registered as a catalog value on the KeycardConfig handed to this PolicyBuilder before use.`,
      )
    }

    const actionName = resolveName(this.actionCatalog, action.name)
    const subjectName = resolveName(this.subjectCatalog, subject.name)

    if (conditions) {
      // The spec requires the builder to reject a conditional rule wildcarded on
      // both sides at the call site, not later in Policy.from. Checked even
      // when emitMeta is false, since it guards evaluation, not diagnostics.
      const anyAction = effectiveAnyAction({ anyAction: this.anyAction })
      const anySubject = effectiveAnySubject({ anySubject: this.anySubject })
      if (
        anyAction !== DISABLED && actionName === anyAction
        && anySubject !== DISABLED && subjectName === anySubject
      ) {
        throw new PolicyArgumentError(
          `A rule wildcarded on both the action ("${anyAction}") and the subject ("${anySubject}") MUST NOT carry a Conditions element.`,
        )
      }
    }

    this.actionsUsed.add(actionName)
    this.subjectsUsed.add(subjectName)

    const rule: RuleTuple = conditions !== undefined
      ? [effect, actionName, subjectName, conditions]
      : [effect, actionName, subjectName]
    this.rules.push(rule)
    return this
  }
}
