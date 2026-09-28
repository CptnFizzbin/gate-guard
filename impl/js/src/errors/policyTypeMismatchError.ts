import { PolicyError } from "./policyError.ts"

export interface TypeMismatchInfo {
  expected: string
  received: string
}

/**
 * Signals that a condition can't be evaluated against the value in hand (a
 * type mismatch or malformed operand). Thrown from an operator built with
 * `createOperator`, it's logged as a warning and the condition evaluates to
 * `false` instead of propagating.
 */
export class PolicyTypeMismatchError extends PolicyError {
  constructor(
    options:
      | { subject: TypeMismatchInfo, value?: never }
      | { subject?: never, value: TypeMismatchInfo },
  ) {
    if (options.subject) {
      const { expected, received } = options.subject
      super(`Expected subject to be of type '${expected}', received '${received}' instead`)
    } else {
      const { expected, received } = options.value
      super(`Expected value to be of type '${expected}', received '${received}' instead`)
    }
    this.name = "PolicyTypeMismatchError"
  }
}
