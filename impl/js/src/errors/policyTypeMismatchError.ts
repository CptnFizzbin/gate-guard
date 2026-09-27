import { PolicyError } from "./policyError.ts"

export interface TypeMismatchInfo {
  expected: string
  received: string
}

/**
 * Signals that a condition can't be meaningfully evaluated against the
 * value in hand (a type mismatch, or a malformed operand). Thrown from an
 * operator's resolver - built-in or custom - it's caught by the
 * `createOperator` wrapper, logged as a warning, and the condition
 * evaluates to `false`.
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
