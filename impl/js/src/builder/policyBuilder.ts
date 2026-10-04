import type { AnyAction } from "../action/action.ts"
import type { AnyCondition } from "../conditions/condition.ts"
import type { Condition } from "../conditions/index.ts"
import { BUILTIN_OPERATOR_NAMES } from "../conditions/operators/defaultOperators.ts"
import type { AnyOperator, InferCondition } from "../conditions/operators/operator.ts"
import { PolicyArgumentError } from "../errors/index.ts"
import type { KeycardConfig } from "../keycardConfig.ts"
import { KeycardContext } from "../keycardContext.ts"
import { Policy } from "../policy/policy.ts"
import type { Effect, Meta, PolicyDefinition, RuleTuple } from "../policy/policyDefinition.ts"
import { DEFAULT_WILDCARD } from "../policy/wildcards.ts"
import type { Subject } from "../subject/index.ts"
import type { AnySubject } from "../subject/subject.ts"
import { KEYCARD_POLICY_VERSION } from "../version.ts"

export const BUILDER_VERSION = KEYCARD_POLICY_VERSION

/**
 * Builds a {@link PolicyDefinition} rule by rule. {@link buildDef} derives
 * `meta.actions`/`meta.subjects`/`meta.operators` from what {@link allow}/
 * {@link deny} used and what `operators` registered, so there is no
 * hand-maintained catalog to keep in sync. `config.actions`/`config.subjects`
 * declare additional vocabulary up front; `config.anyAction`/`config.anySubject`
 * declare the wildcard tokens, which can't be inferred from usage.
 */
export class PolicyBuilder<
  TActions extends AnyAction = AnyAction,
  TSubjects extends AnySubject = AnySubject,
  TOperators extends AnyOperator = AnyOperator,
> {
  private readonly ctx: KeycardContext<TOperators>
  private readonly rules: RuleTuple[] = []

  /**
   * @param config shared with `Policy` - see `KeycardConfig`
   * @throws PolicyArgumentError if `emitMeta` is true and one Action/Subject is
   *   registered under two catalog keys
   */
  constructor(config: KeycardContext<TOperators> | KeycardConfig<TOperators> = {}) {
    this.ctx = KeycardContext.from(config)
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

  build(): Policy<TActions, TSubjects> {
    return new Policy(this.buildDef(), this.ctx)
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
    if (this.ctx.anyAction !== DEFAULT_WILDCARD) meta.anyAction = this.ctx.anyAction
    if (this.ctx.anySubject !== DEFAULT_WILDCARD) meta.anySubject = this.ctx.anySubject

    if (this.ctx.emitMeta) {
      meta.actions = [...this.ctx.actions.names()]
      meta.subjects = [...this.ctx.subjects.names()]

      const custom = [...this.ctx.operators.names()].filter((name) => !BUILTIN_OPERATOR_NAMES.has(name))
      if (custom.length > 0) meta.operators = custom
    }

    return meta
  }

  private addRule(effect: Effect, action: TActions, subject: TSubjects, conditions?: AnyCondition): this {
    if (this.ctx.emitMeta && action.__dynamic && !this.ctx.actions.has(action.id)) {
      throw new PolicyArgumentError(
        `This Action was created via createAction() with no name and must be registered as a catalog value on the KeycardConfig handed to this PolicyBuilder before use.`,
      )
    }

    if (this.ctx.emitMeta && subject.__dynamic && !this.ctx.subjects.has(subject.id)) {
      throw new PolicyArgumentError(
        `This Subject was created via createSubject() with no name and must be registered as a catalog value on the KeycardConfig handed to this PolicyBuilder before use.`,
      )
    }

    const actionName = this.ctx.actions.add(action).name
    const subjectName = this.ctx.subjects.add(subject).name

    if (conditions) {
      // The spec requires the builder to reject a conditional rule wildcarded
      // on both sides at the call site, not later in Policy.from.
      const { anyAction, anySubject } = this.ctx
      if (
        anyAction !== false && anyAction !== null && actionName === anyAction
        && anySubject !== false && anySubject !== null && subjectName === anySubject
      ) {
        throw new PolicyArgumentError(
          `A rule wildcarded on both the action ("${anyAction}") and the subject ("${anySubject}") MUST NOT carry a Conditions element.`,
        )
      }
    }

    const rule: RuleTuple = conditions !== undefined
      ? [effect, actionName, subjectName, conditions]
      : [effect, actionName, subjectName]

    this.rules.push(rule)

    return this
  }
}
