import type { PolicyDefinition } from "./policyDefinition.ts"
import type { AnyAction } from "../action/action.ts"
import type { Action } from "../action/index.ts"
import { ConditionResolver } from "../conditions/index.ts"
import type { AnyOperator } from "../conditions/operators/operator.ts"
import { PolicyError } from "../errors/index.ts"
import type { KeycardConfig } from "../keycardConfig.ts"
import { PolicyValidator } from "./policyValidator.ts"
import { KeycardContext } from "../keycardContext.ts"
import type { JsonObject } from "../lib/json.ts"
import type { Subject } from "../subject/index.ts"
import type { AnySubject } from "../subject/subject.ts"

/** Returns a deep copy of `definition`, except `meta.application`, which is kept by reference: it's opaque application data that may not be structured-cloneable. */
function cloneDefinition(definition: PolicyDefinition): PolicyDefinition {
  const { meta, rules, ...rest } = definition
  const clone: PolicyDefinition = {
    ...rest,
    rules: rules.map((rule) => structuredClone(rule)),
  }
  if (meta) {
    const { application, ...metaRest } = meta
    clone.meta = structuredClone(metaRest)
    if ("application" in meta) clone.meta.application = application
  }
  return clone
}

export class Policy<
  TActions extends AnyAction = AnyAction,
  TSubjects extends AnySubject = AnySubject,
> {
  private readonly ctx: KeycardContext<AnyOperator>
  private readonly definition: PolicyDefinition
  private readonly resolver: ConditionResolver

  constructor(
    definition: PolicyDefinition | JsonObject,
    config: KeycardContext | KeycardConfig<AnyOperator> = {},
  ) {
    this.ctx = KeycardContext.from(config)

    const validator: PolicyValidator = new PolicyValidator(this.ctx)
    validator.validate(definition)

    this.definition = definition
    this.resolver = new ConditionResolver(this.ctx)
  }

  static from<
    TActions extends Action = AnyAction,
    TSubjects extends Subject = AnySubject,
  >(
    definition: PolicyDefinition,
    config: KeycardConfig<AnyOperator> = {},
  ): Policy<TActions, TSubjects> {
    return new Policy(definition, config)
  }

  private static validateOperatorsRegistered(
    definition: PolicyDefinition, resolver: ConditionResolver): void {
    const declared = definition.meta?.operators
    if (!declared) return

    resolver.assertAllRegistered(declared)
  }

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
      const actionName = this.ctx.actions.get(action)?.name
      const subjectName = this.ctx.subjects.get(subject)?.name

      throw new PolicyError(
        `"${actionName}" is not allowed on this "${subjectName}"`)
    }
  }

  private checkPermission(action: TActions, subject: TSubjects): boolean {
    const actionName = this.ctx.actions.get(action)?.name
    const subjectName = this.ctx.subjects.get(subject)?.name
    const rules = this.definition.rules

    for (let i = rules.length - 1; i >= 0; i--) {
      const [effect, ruleAction, ruleSubject, ruleConditions] = rules[i]

      if (!this.ctx.actions.equal(ruleAction, actionName)) continue
      if (!this.ctx.subjects.equal(ruleSubject, subjectName)) continue

      if (ruleConditions) {
        // A bare check has no instance for the conditions to inspect; without
        // this guard, a condition such as { x: { $ne: 1 } } would match it.
        if (subject.claims === undefined) continue
        if (!this.resolver.evaluate(subject.claims, ruleConditions)) continue
      }

      return effect === "allow"
    }

    return false
  }
}
