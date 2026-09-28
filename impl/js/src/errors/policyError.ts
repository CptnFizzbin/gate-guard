/** Base class of every error KeyCard throws; also thrown directly by `Policy.require()` when the check is denied. */
export class PolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PolicyError"
  }
}
