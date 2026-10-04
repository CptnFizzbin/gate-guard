import type { Condition } from "./condition.ts"
import { KeycardContext } from "../keycardContext.ts"
import type { OperatorContext } from "./operators/operator.ts"
import { PolicyError, PolicyLoadException } from "../errors/index.ts"
import { PolicyTypeMismatchError } from "../errors/policyTypeMismatchError.ts"
import type { JsonValue } from "../lib/json.ts"
import type { Logger } from "../lib/logger.ts"
import { checkField } from "./operators/field/fieldAccess.ts"

/**
 * Evaluates a Conditions tree against a subject, using the built-in operators
 * plus any custom operators it was constructed with.
 */
export class ConditionResolver {
  private readonly operators: KeycardContext["operators"]
  private readonly logger: Logger
  private readonly topContext: OperatorContext
  private readonly nestedContext: OperatorContext

  constructor(ctx: KeycardContext = KeycardContext.default()) {
    this.logger = ctx.logger
    this.operators = ctx.operators
    this.topContext = this.makeContext(true)
    this.nestedContext = this.makeContext(false)
  }

  /** Throws a {@link PolicyLoadException} if any name in `names` isn't registered on this resolver, built-in or custom. */
  assertAllRegistered(names: Iterable<string>): void {
    for (const name of names) {
      if (!this.operators.has(name)) {
        throw new PolicyLoadException(
          `meta.operators declares "${name}" but no operator with that name is registered.`,
        )
      }
    }
  }

  evaluate<TSubject>(
    subject: TSubject,
    condition: Condition<TSubject>,
  ): boolean {
    return this.evaluateInternal(subject, condition, true)
  }

  private evaluateInternal<TSubject>(
    subject: TSubject,
    condition: Condition<TSubject>,
    canNarrowField: boolean,
  ): boolean {
    if (!condition) {
      return this.evaluateOperator(subject, "$eq", condition, canNarrowField)
    }

    if (Array.isArray(condition)) {
      // Not a shorthand for anything (only scalars are shorthand for
      // `$eq`) - reading an array's indices as field names would match by
      // accident, so fail closed instead.
      this.logger.warn(`Malformed condition: expected an object or a scalar, received an array (${JSON.stringify(condition)}).`)
      return false
    }

    if (typeof condition === "object") {
      return Object.entries(condition).every(([key, value]) => {
        if (key.startsWith("$")) {
          return this.evaluateOperator(subject, key, value, canNarrowField)
        }

        try {
          return checkField(subject, key, value, this.contextFor(canNarrowField))
        } catch (e) {
          if (e instanceof PolicyTypeMismatchError) {
            this.logger.warn(e.message)
            return false
          }
          throw e
        }
      })
    }

    return this.evaluateOperator(subject, "$eq", condition, canNarrowField)
  }

  private evaluateOperator<TSubject>(
    subject: TSubject,
    operatorName: string,
    value: JsonValue,
    canNarrowField: boolean,
  ): boolean {
    const operator = this.operators.get(operatorName)
    if (!operator) throw new PolicyError(`Unknown operator ${operatorName}`)

    return operator.resolve(subject, value, this.contextFor(canNarrowField))
  }

  private contextFor(canNarrowField: boolean): OperatorContext {
    return canNarrowField
      ? this.topContext
      : this.nestedContext
  }

  private makeContext(canNarrowField: boolean): OperatorContext {
    return {
      logger: this.logger,
      canNarrowField: () => canNarrowField,
      resolveSubcondition: (subject, condition) => this.evaluateInternal(subject, condition, canNarrowField),
      resolveFieldSubcondition: (subject, condition) => this.evaluateInternal(subject, condition, false),
    }
  }
}
