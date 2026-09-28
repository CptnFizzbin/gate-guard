import type { Meta } from "./policyDefinition.ts"

/**
 * Returned by `effectiveAnyAction`/`effectiveAnySubject` when a policy
 * disables that wildcard position (`meta.anyAction`/`meta.anySubject: null`).
 * No rule's action or subject string ever equals it.
 */
export const DISABLED: unique symbol = Symbol("keycard:wildcard-disabled")

const DEFAULT_WILDCARD = "_ANY_"

export function effectiveAnyAction(meta?: Meta): string | typeof DISABLED {
  if (!meta || meta.anyAction === undefined) return DEFAULT_WILDCARD
  if (meta.anyAction === null) return DISABLED
  return meta.anyAction
}

export function effectiveAnySubject(meta?: Meta): string | typeof DISABLED {
  if (!meta || meta.anySubject === undefined) return DEFAULT_WILDCARD
  if (meta.anySubject === null) return DISABLED
  return meta.anySubject
}
