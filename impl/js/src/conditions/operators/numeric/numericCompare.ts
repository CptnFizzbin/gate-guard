import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"

/**
 * Applies `cmp` to `subject` and `value` for `$gt`/`$gte`/`$lt`/`$lte`. Both
 * MUST be numbers - never coerced from strings - and comparison uses
 * IEEE-754 double semantics, so `NaN` never compares true.
 *
 * @throws PolicyTypeMismatchError if `subject` or `value` isn't a number
 */
export function numericCompare(
  subject: unknown,
  value: unknown,
  cmp: (a: number, b: number) => boolean,
): boolean {
  if (typeof subject !== "number") {
    throw new PolicyTypeMismatchError({ subject: { expected: "number", received: typeof subject } })
  }
  if (typeof value !== "number") {
    throw new PolicyTypeMismatchError({ value: { expected: "number", received: typeof value } })
  }

  return cmp(subject, value)
}
