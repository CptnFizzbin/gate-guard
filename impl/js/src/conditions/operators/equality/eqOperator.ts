import { createOperator } from "../operator.ts"

/**
 * `$eq` - value equality for primitives, not reference/identity equality.
 * Values of different types are simply unequal, never a type mismatch. A bare
 * scalar condition is shorthand for `$eq`.
 */
export const EqOperator = createOperator("$eq", (subject, value) => subject === value)
