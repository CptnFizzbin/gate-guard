import { createOperator } from "../operator.ts"

/** `$eq` - strict (`===`) equality; values of different types are unequal, never a type mismatch. */
export const EqOperator = createOperator("$eq", (subject, value) => subject === value)
