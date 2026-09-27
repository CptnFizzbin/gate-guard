import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import type { AnyCondition } from "../../condition.ts"
import { createOperator } from "../operator.ts"

/**
 * `$or` - evaluates every sub-condition against the same subject,
 * whatever its value (including `null`); `{ $or: [] }` is `false` (no alternative to satisfy). A non-array operand is
 * a type mismatch.
 */
export const OrOperator = createOperator<unknown, AnyCondition[]>("$or", (subject, subConditions, { resolveSubcondition }) => {
  if (!Array.isArray(subConditions)) throw new PolicyTypeMismatchError({
    value: {
      expected: "array",
      received: typeof subConditions,
    },
  })

  return subConditions.some((condition) => {
    return resolveSubcondition(subject, condition)
  })
})
