import type { Meta } from "./policyDefinition.ts"
import { PolicyLoadException } from "../errors/index.ts"

/**
 * Returned by `effectiveAnyAction`/`effectiveAnySubject` when a policy
 * disables that wildcard position (`meta.anyAction`/`meta.anySubject: null`
 * or `false`). No rule's action or subject string ever equals it.
 */
export const DISABLED: unique symbol = Symbol("keycard:wildcard-disabled")

export const DEFAULT_WILDCARD = "_ANY_"

/**
 * Resolves a declared wildcard token: absent is `"_ANY_"`, `null` or `false`
 * is {@link DISABLED}, and a string is itself.
 *
 * @throws PolicyLoadException for any other value.
 */
export function resolveWildcard(declared: unknown, field: string): string | typeof DISABLED {
  if (declared === undefined) return DEFAULT_WILDCARD
  if (declared === null || declared === false) return DISABLED
  if (typeof declared === "string") return declared
  throw new PolicyLoadException(
    `${field} must be a string, null, or false - got ${JSON.stringify(declared)}.`,
  )
}

export function effectiveAnyAction(meta?: Meta): string | typeof DISABLED {
  return resolveWildcard(meta?.anyAction, "meta.anyAction")
}

export function effectiveAnySubject(meta?: Meta): string | typeof DISABLED {
  return resolveWildcard(meta?.anySubject, "meta.anySubject")
}
