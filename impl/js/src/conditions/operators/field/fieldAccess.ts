import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import type { AnyCondition, Condition } from "../../condition.ts"
import type { OperatorContext } from "../operator.ts"

/**
 * Returns `true` when `subject` is an object carrying `fieldName`, either as
 * its own property or declared by a class in its prototype chain. Members it
 * only inherits from `Object.prototype` (`toString`, `__proto__`, ...), and
 * `constructor`, don't count as fields.
 */
export function hasField(subject: unknown, fieldName: string): subject is Record<string, unknown> {
  if (subject === null || typeof subject !== "object") return false

  if (Object.hasOwn(subject, fieldName)) return true
  // Every prototype carries a `constructor` - it's never a declared field.
  if (fieldName === "constructor") return false

  for (let proto = Object.getPrototypeOf(subject); proto !== null; proto = Object.getPrototypeOf(proto)) {
    if (Object.hasOwn(proto, fieldName)) return proto !== Object.prototype
  }
  return false
}

/** Returns `true` when `condition` is exactly `{ $ne: ... }`; a `$ne` alongside other keys, or nested deeper, doesn't count. */
export function isBareNe<TSubject>(condition: Condition<TSubject>): boolean {
  // TODO: decide whether `{ $not: { $eq: x } }` on a missing field should also
  // be true, since $not carries the same "exact negation" contract as $ne.
  return (
    typeof condition === "object"
    && condition !== null
    && !Array.isArray(condition)
    && Object.keys(condition).length === 1
    && "$ne" in condition
  )
}

/**
 * Evaluates `condition` against the `fieldName` field of `subject`, as both a
 * bare-key field condition and `$field` do. The context's SubjectFieldMapper,
 * if any, is tried first; a field it doesn't define uses ordinary property
 * access.
 *
 * @throws PolicyTypeMismatchError if `ctx` doesn't allow field narrowing,
 *   i.e. a field condition is nested inside another field condition
 */
export function checkField<TSubject>(
  subject: TSubject, fieldName: string, condition: AnyCondition, ctx: OperatorContext): boolean {
  // A second narrowing step is a malformed condition shape, not a data
  // mismatch, so it's diagnosed rather than silently returning false.
  if (!ctx.canNarrowField()) {
    throw new PolicyTypeMismatchError({
      value: {
        expected: `a leaf condition for field "${fieldName}" (v1 supports only top-level field access - no further nesting)`,
        received: "a nested field condition",
      },
    })
  }

  // The spec requires $ne to be the exact negation of $eq, and $eq on a
  // missing field is false, so a bare $ne on a missing field must be true;
  // every other condition on a missing field is false.
  return hasField(subject, fieldName)
    ? ctx.resolveFieldSubcondition(subject[fieldName], condition)
    : isBareNe(
        condition)
}
