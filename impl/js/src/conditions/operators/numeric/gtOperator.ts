import { createOperator } from "../operator.ts"
import { numericCompare } from "./numericCompare.ts"

export const GtOperator = createOperator("$gt", (subject, value) => numericCompare(subject, value, (a, b) => a > b))
