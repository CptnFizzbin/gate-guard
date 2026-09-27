/**
 * Base class for every error KeyCard throws - catch this to handle any
 * KeyCard failure (load, version, argument, type mismatch, or a failed
 * `require()`) in one place.
 */
export class PolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PolicyError"
  }
}
