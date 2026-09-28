import type { AnyCondition } from "../../condition.ts"
import { createOperator } from "../operator.ts"

/** `$not` - the exact negation of the sub-condition against the same subject. */
export const NotOperator = createOperator<unknown, AnyCondition>("$not", (subject, condition, { resolveSubcondition }) =>
  !resolveSubcondition(subject, condition),
)
