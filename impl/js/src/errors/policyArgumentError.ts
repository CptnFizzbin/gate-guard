import { PolicyError } from "./policyError.ts"

/**
 * Thrown at the call site when `PolicyBuilder` or a `KeycardConfig` catalog
 * is given an invalid argument: a rule wildcarded on both action and subject
 * that carries a Conditions element, an unregistered dynamic Action/Subject,
 * or one Action/Subject registered under two catalog keys.
 */
export class PolicyArgumentError extends PolicyError {
  constructor(message: string) {
    super(message)
    this.name = "PolicyArgumentError"
  }
}
