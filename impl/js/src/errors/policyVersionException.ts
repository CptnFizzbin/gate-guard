/**
 * Thrown when constructing a `Policy` from a `PolicyDefinition` whose
 * `version` this implementation doesn't support - a different MAJOR, or a
 * MINOR higher than it understands. `PATCH` never affects this decision.
 */
export class PolicyVersionException extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PolicyVersionException"
  }
}
