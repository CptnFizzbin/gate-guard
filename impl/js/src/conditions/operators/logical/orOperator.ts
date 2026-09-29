import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import type { AnyCondition } from "../../condition.ts"
import { createOperator } from "../operator.ts"

/** `$or` - matches when any sub-condition matches the same subject, `null` included; `{ $or: [] }` is `false`. */
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
