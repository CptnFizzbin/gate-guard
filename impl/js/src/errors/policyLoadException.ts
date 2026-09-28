/**
 * Thrown when constructing a `Policy` from an invalid `PolicyDefinition` or
 * operator set: a malformed rule tuple, a both-sides-wildcarded rule carrying
 * a Conditions element, a rule referencing an action/subject/custom-operator
 * name outside a declared `meta` catalog, a `meta.operators` entry with no
 * registered operator, or two operators sharing a name.
 */
export class PolicyLoadException extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PolicyLoadException"
  }
}
