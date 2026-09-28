import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import { createOperator } from "../operator.ts"

/** `$in` - true when the operand array contains `subject`, compared with `$eq` semantics. The operand MUST be an array. */
export const InOperator = createOperator("$in", (subject, value) => {
  if (!Array.isArray(value)) {
    throw new PolicyTypeMismatchError({ value: { expected: "array", received: typeof value } })
  }

  return value.some((v) => v === subject)
})
