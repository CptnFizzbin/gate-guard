import { PolicyTypeMismatchError } from "../../errors/policyTypeMismatchError.ts"
import type { JsonValue } from "../../lib/json.ts"
import { getLogger } from "../../lib/logger.ts"
import type { Condition } from "../condition.ts"

export interface OperatorContext {
  /** Evaluates `condition` against `subject`, preserving whether this point in the tree may still narrow into a field - used by $and/$or/$not, which don't narrow. */
  resolveSubcondition<TSubject>(subject: TSubject, condition: Condition<TSubject>): boolean

  /** Evaluates `condition` against a subject already narrowed by one field access, disabling any further field narrowing beneath it - used by the bare-key field path and `$field`. */
  resolveFieldSubcondition<TSubject>(subject: TSubject, condition: Condition<TSubject>): boolean

  /** Returns `true` if a field condition (bare-key or `$field`) may still narrow at this point in the tree - the spec permits exactly one level. */
  canNarrowField(): boolean
}

export interface Operator<TSubject, TValue = JsonValue> {
  name: `$${string}`
  resolve: (subject: TSubject, value: TValue, ctx: OperatorContext) => boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOperator = Operator<any, any>

export type InferCondition<TOperator extends AnyOperator> =
  TOperator extends Operator<infer _, infer TValue>
    ? { [key in TOperator["name"]]: TValue }
    : never

export function createOperator<TSubject, TValue = JsonValue>(
  name: Operator<TSubject, TValue>["name"],
  resolver: Operator<TSubject, TValue>["resolve"],
): Operator<TSubject, TValue> {
  return {
    name,
    resolve: (subject, value, ctx) => {
      try {
        return resolver(subject, value, ctx)
      } catch (e) {
        if (e instanceof PolicyTypeMismatchError) {
          // getLogger() is called per failure rather than cached at module
          // load, so a setLogger() call made after this module is imported
          // still takes effect.
          getLogger().warn(e.message)
          return false
        }

        throw e
      }
    },
  }
}

/** A bare operator resolver function, keyed by its `$name` in an {@link OperatorCatalog}. */
export type OperatorResolver<TSubject = unknown, TValue = JsonValue> = (
  subject: TSubject,
  value: TValue,
  ctx: OperatorContext,
) => boolean

/**
 * A keyed collection of custom operators, as an alternative to an
 * `AnyOperator[]` built via `createOperator`: each key is the operator's
 * `$`-prefixed name and its value is the resolver function. Handed to
 * `PolicyBuilder`/`Policy` via `KeycardConfig.operators`.
 *
 * ```ts
 * const operators: OperatorCatalog = { $even: (subject: number) => subject % 2 === 0 }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OperatorCatalog<TSubject = any, TValue = JsonValue> = Record<`$${string}`, OperatorResolver<TSubject, TValue>>

/** Normalizes `KeycardConfig.operators` (an `AnyOperator[]`, an `OperatorCatalog`, or neither) into the `AnyOperator[]` form `ConditionResolver` accepts. */
export function normalizeOperators<TOperators extends AnyOperator>(
  operators: TOperators[] | OperatorCatalog | undefined,
): AnyOperator[] {
  if (operators === undefined) return []
  if (Array.isArray(operators)) return operators
  return Object.entries(operators).map(([name, resolve]) => createOperator(name as `$${string}`, resolve))
}
