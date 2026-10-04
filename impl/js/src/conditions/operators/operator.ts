import { PolicyArgumentError } from "../../errors/policyArgumentError.ts"
import { PolicyTypeMismatchError } from "../../errors/policyTypeMismatchError.ts"
import type { JsonValue } from "../../lib/json.ts"
import type { Logger } from "../../lib/logger.ts"
import { randomId } from "../../lib/randomId.ts"
import type { Condition } from "../condition.ts"

export interface OperatorContext {
  /** Receives this evaluation's diagnostics: the `Policy`'s `KeycardConfig.logger`, or a no-op logger when unset. */
  readonly logger: Logger

  /** Evaluates `condition` against `subject`, preserving whether this point in the tree may still narrow into a field - used by $and/$or/$not, which don't narrow. */
  resolveSubcondition<TSubject>(subject: TSubject, condition: Condition<TSubject>): boolean

  /** Evaluates `condition` against a subject already narrowed by one field access, disabling any further field narrowing beneath it - used by the bare-key field path and `$field`. */
  resolveFieldSubcondition<TSubject>(subject: TSubject, condition: Condition<TSubject>): boolean

  /** Returns `true` if a field condition (bare-key or `$field`) may still narrow at this point in the tree - the spec permits exactly one level. */
  canNarrowField(): boolean
}

export type OperatorName = `$${string}`

export interface Operator<TSubject, TValue = JsonValue> {
  id: string
  name: OperatorName
  resolve: (subject: TSubject, value: TValue, ctx: OperatorContext) => boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOperator = Operator<any, any>

export type InferCondition<TOperator extends AnyOperator> =
  TOperator extends Operator<infer _, infer TValue>
    ? { [key in TOperator["name"]]: TValue }
    : never

/**
 * @throws PolicyArgumentError unless `name` is `$` followed by at least one
 *   character - a key without the prefix is always read as a field name, so
 *   such an operator could never be reached.
 */
export function assertOperatorName(name: unknown): asserts name is OperatorName {
  if (typeof name !== "string" || !name.startsWith("$") || name.length < 2) {
    throw new PolicyArgumentError(`Invalid operator name ${JSON.stringify(name)}: operator names MUST start with "$".`)
  }
}

/**
 * Creates a custom operator named `name`. If `resolver` throws a
 * `PolicyTypeMismatchError`, the operator logs a warning to `ctx.logger` and
 * evaluates to `false`; any other error propagates.
 *
 * ```ts
 * const HasRole = createOperator("$hasRole", (subject: { roles: string[] }, role: string) => subject.roles.includes(role))
 * ```
 *
 * @throws PolicyArgumentError if `name` isn't `$` followed by at least one character.
 */
export function createOperator<TSubject, TValue = JsonValue>(
  name: Operator<TSubject, TValue>["name"],
  resolver: Operator<TSubject, TValue>["resolve"],
): Operator<TSubject, TValue> {
  // Checked at runtime too: names can come from untyped sources, such as an
  // OperatorCatalog built from data or a plain JS caller.
  assertOperatorName(name)
  return {
    id: randomId(),
    name,
    resolve: (subject, value, ctx) => {
      try {
        return resolver(subject, value, ctx)
      } catch (e) {
        if (e instanceof PolicyTypeMismatchError) {
          ctx.logger.warn(e.message)
          return false
        }

        throw e
      }
    },
  }
}

/** A bare operator resolver function, keyed by its `$name` in an {@link OperatorsRecord}. */
export type OperatorResolver = (
  subject: unknown,
  value: JsonValue,
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
export type OperatorsRecord = Record<OperatorName, OperatorResolver>
