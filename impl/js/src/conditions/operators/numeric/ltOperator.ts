import { createOperator } from "../operator.ts"
import { numericCompare } from "./numericCompare.ts"

export const LtOperator = createOperator("$lt", (subject, value) => numericCompare(subject, value, (a, b) => a < b))
