import type { JsonValue } from "../../../lib/json.ts"
import { createOperator } from "../operator.ts"

/** `$ne` - the exact negation of `$eq` for the same subject/value pair. Like `$eq`, never a type mismatch. */
export const NeOperator = createOperator<JsonValue>("$ne", (subject, value, { resolveSubcondition }) => {
  return !resolveSubcondition(subject, { $eq: value })
})
