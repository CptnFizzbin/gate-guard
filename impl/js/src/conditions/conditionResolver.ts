import type { Condition } from "./condition.ts"
import type { AnyOperator, OperatorContext } from "./operators/operator.ts"
import { assertOperatorName } from "./operators/operator.ts"
import { PolicyLoadException } from "../errors/index.ts"
import { PolicyTypeMismatchError } from "../errors/policyTypeMismatchError.ts"
import type { JsonValue } from "../lib/json.ts"
import type { Logger } from "../lib/logger.ts"
import { getLogger } from "../lib/logger.ts"
import type { SubjectFieldMapper } from "../subject/subjectFieldMapper.ts"
import { DefaultOperators } from "./operators/defaultOperators.ts"
import type { FieldMapperContext } from "./operators/field/fieldAccess.ts"
import { checkField } from "./operators/field/fieldAccess.ts"

export const BUILTIN_OPERATOR_NAMES: ReadonlySet<string> = new Set(DefaultOperators.map((op) => op.name))

/**
 * Evaluates a Conditions tree against a subject, using the built-in operators
 * plus any custom operators it was constructed with.
 */
export class ConditionResolver {
  private readonly operatorRegistry = new Map<string, AnyOperator>()
  private readonly explicitLogger: Logger | undefined
  private readonly topContext: OperatorContext = this.makeContext(true)
  private readonly nestedContext: OperatorContext = this.makeContext(false)

  /**
   * @param operators custom operators to register alongside the built-ins
   * @param logger receives type-mismatch and malformed-condition diagnostics;
   *   defaults to the module-level logger, including one set via `setLogger()`
   *   after this resolver was constructed.
   * @throws PolicyLoadException if an operator's name collides with a
   *   built-in or with another operator in `operators`
   * @throws PolicyArgumentError if an operator's name isn't `$`-prefixed
   */
  constructor(operators: AnyOperator[] = [], logger?: Logger) {
    this.explicitLogger = logger

    for (const operator of DefaultOperators) {
      this.operatorRegistry.set(operator.name, operator)
    }

    for (const operator of operators) {
      assertOperatorName(operator.name)
      if (this.operatorRegistry.has(operator.name)) {
        throw new PolicyLoadException(
          `Duplicate operator "${operator.name}": an operator with this name is already registered (built-in or custom) - operator names MUST be unique.`,
        )
      }
      this.operatorRegistry.set(operator.name, operator)
    }
  }

  /** Throws a {@link PolicyLoadException} if any name in `names` isn't registered on this resolver, built-in or custom. */
  assertAllRegistered(names: Iterable<string>): void {
    for (const name of names) {
      if (!this.operatorRegistry.has(name)) {
        throw new PolicyLoadException(
          `meta.operators declares "${name}" but no operator with that name is registered.`,
        )
      }
    }
  }

  /**
   * Returns whether `subject` satisfies `condition`.
   *
   * @param fieldMapper when given, tried first for any field read directly
   *   off `subject`, including inside `$and`/`$or`/`$not`. A field the mapper
   *   doesn't define, or any field read after narrowing into a nested value,
   *   uses ordinary property access.
   */
  evaluate<TSubject>(subject: TSubject, condition: Condition<TSubject>, fieldMapper?: SubjectFieldMapper<TSubject>): boolean {
    return this.evaluateInternal(subject, condition, true, fieldMapper as SubjectFieldMapper<unknown> | undefined)
  }

  private evaluateInternal<TSubject>(
    subject: TSubject,
    condition: Condition<TSubject>,
    canNarrowField: boolean,
    fieldMapper?: SubjectFieldMapper<unknown>,
  ): boolean {
    if (!condition) {
      return this.evaluateOperator(subject, "$eq", condition, canNarrowField, fieldMapper)
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
          return this.evaluateOperator(subject, key, value, canNarrowField, fieldMapper)
        }

        try {
          return checkField(subject, key, value, this.contextFor(canNarrowField, fieldMapper))
        } catch (e) {
          if (e instanceof PolicyTypeMismatchError) {
            this.logger.warn(e.message)
            return false
          }
          throw e
        }
      })
    }

    return this.evaluateOperator(subject, "$eq", condition, canNarrowField, fieldMapper)
  }

  private evaluateOperator<TSubject>(
    subject: TSubject,
    operatorName: string,
    value: JsonValue,
    canNarrowField: boolean,
    fieldMapper?: SubjectFieldMapper<unknown>,
  ): boolean {
    const operator = this.operatorRegistry.get(operatorName)
    if (!operator) return false

    return operator.resolve(subject, value, this.contextFor(canNarrowField, fieldMapper))
  }

  private contextFor(canNarrowField: boolean, fieldMapper?: SubjectFieldMapper<unknown>): OperatorContext {
    if (!canNarrowField) return this.nestedContext
    // A fieldMapper only lives for one top-level evaluate() call, so its
    // context is built per call; the mapper-less contexts are shared to avoid
    // allocating on the common path.
    return fieldMapper ? this.makeContext(true, fieldMapper) : this.topContext
  }

  private get logger(): Logger {
    return this.explicitLogger ?? getLogger()
  }

  private makeContext(canNarrowField: boolean, fieldMapper?: SubjectFieldMapper<unknown>): OperatorContext {
    // Looked up lazily, so a later setLogger() still reaches an existing resolver.
    const currentLogger = () => this.logger
    const base: OperatorContext = {
      get logger() {
        return currentLogger()
      },
      canNarrowField: () => canNarrowField,
      resolveSubcondition: (subject, condition) => this.evaluateInternal(subject, condition, canNarrowField, fieldMapper),
      resolveFieldSubcondition: (subject, condition) => this.evaluateInternal(subject, condition, false),
    }
    if (!fieldMapper) return base

    const mapped: FieldMapperContext = { ...base, fieldMapper }
    return mapped
  }
}
