import type { Meta } from "./policyDefinition.ts"
import { PolicyLoadException } from "../errors/index.ts"

/**
 * Returned by `effectiveAnyAction`/`effectiveAnySubject` when a policy
 * explicitly disables that wildcard position (`meta.anyAction`/
 * `meta.anySubject: null` or `false`). No ordinary string can ever equal
 * this sentinel, so the wildcard branch of `matchesAction`/`matchesSubject`
 * never succeeds for that position.
 */
export const DISABLED: unique symbol = Symbol("keycard:wildcard-disabled")

/** The wildcard token every policy uses for a position whose `meta.anyAction`/`meta.anySubject` is undeclared. */
export const DEFAULT_WILDCARD = "_ANY_"

/**
 * A declared wildcard token: absent -> the `"_ANY_"` default; explicit
 * string -> that string; explicit `null` or `false` -> DISABLED; anything
 * else is invalid and throws a {@link PolicyLoadException} rather than being
 * silently coerced or compared against later.
 */
export function resolveWildcard(declared: unknown, field: string): string | typeof DISABLED {
  if (declared === undefined) return DEFAULT_WILDCARD
  if (declared === null || declared === false) return DISABLED
  if (typeof declared === "string") return declared
  throw new PolicyLoadException(
    `${field} must be a string, null, or false - got ${JSON.stringify(declared)}.`,
  )
}

/** The effective `meta.anyAction` - see {@link resolveWildcard}. */
export function effectiveAnyAction(meta?: Meta): string | typeof DISABLED {
  return resolveWildcard(meta?.anyAction, "meta.anyAction")
}

/** The effective `meta.anySubject` - see {@link resolveWildcard}. */
export function effectiveAnySubject(meta?: Meta): string | typeof DISABLED {
  return resolveWildcard(meta?.anySubject, "meta.anySubject")
}
