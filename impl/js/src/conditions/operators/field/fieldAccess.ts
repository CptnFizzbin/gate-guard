import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import type { SubjectFieldMapper } from "../../../subject/subjectFieldMapper.ts"
import type { AnyCondition, Condition } from "../../condition.ts"
import type { OperatorContext } from "../operator.ts"

/**
 * Returns `true` when `subject` is a non-null object carrying `fieldName`.
 * A missing field or non-object subject counts as absence, not a type
 * mismatch, so this never throws.
 */
export function hasField(subject: unknown, fieldName: string): subject is Record<string, unknown> {
  return subject !== null && typeof subject === "object" && fieldName in subject
}

/**
 * Returns `true` when `condition` is exactly `{ $ne: ... }` - the only field
 * condition a missing field satisfies. A `$ne` that is one key among several,
 * or nested deeper, doesn't count.
 */
export function isBareNe<TSubject>(condition: Condition<TSubject>): boolean {
  // The spec requires $ne to be the exact negation of $eq, and $eq on a
  // missing field is false, so a bare $ne on a missing field must be true;
  // every other operator keeps the blanket false.
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
 * An {@link OperatorContext} additionally carrying the SubjectFieldMapper for
 * the top-level subject. Only present where `canNarrowField()` is `true` - the
 * only point in the tree where the subject in scope is still the top-level one.
 */
export interface FieldMapperContext extends OperatorContext {
  readonly fieldMapper: SubjectFieldMapper<unknown>
}

function hasFieldMapper(ctx: OperatorContext): ctx is FieldMapperContext {
  return "fieldMapper" in ctx
}

/**
 * Evaluates `condition` against the `fieldName` field of `subject`, as both a
 * bare-key field condition and `$field` do. The context's SubjectFieldMapper,
 * if any, is tried first; a field it doesn't define uses ordinary property
 * access. A missing field satisfies only a bare `$ne` (see {@link isBareNe}).
 *
 * @throws PolicyTypeMismatchError if `ctx` doesn't allow field narrowing,
 *   i.e. a field condition is nested inside another field condition
 */
export function checkField<TSubject>(subject: TSubject, fieldName: string, condition: AnyCondition, ctx: OperatorContext): boolean {
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

  if (hasFieldMapper(ctx) && fieldName in ctx.fieldMapper) {
    return ctx.resolveFieldSubcondition(ctx.fieldMapper[fieldName](subject), condition)
  }

  return hasField(subject, fieldName) ? ctx.resolveFieldSubcondition(subject[fieldName], condition) : isBareNe(condition)
}
