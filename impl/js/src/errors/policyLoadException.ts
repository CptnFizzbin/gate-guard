import { PolicyError } from "./policyError.ts"

/**
 * Thrown when constructing a `Policy` from an invalid `PolicyDefinition` or
 * operator set: a malformed document or rule tuple, an invalid wildcard token
 * or `meta` catalog, a both-sides-wildcarded rule carrying a Conditions
 * element, a rule referencing an action/subject/custom-operator name outside a
 * declared `meta` catalog, a `meta.operators` entry with no registered
 * operator, or two operators sharing a name.
 */
export class PolicyLoadException extends PolicyError {
  constructor(message: string) {
    super(message)
    this.name = "PolicyLoadException"
  }
}
