import type { AnySubject, Subject } from "./subject.ts"
import { randomId } from "../lib/randomId.ts"

/**
 * Options for the dynamic (no-name) form of `createSubject` - a catalog key
 * supplies the name, so this form has no `name` parameter of its own.
 */
export interface CreateSubjectOptions<TData, TArgs extends unknown[] = [TData]> {
  from?: (...args: TArgs) => TData
}

function setClaims<
  TClaims,
  TArgs extends unknown[] = [TClaims],
>(subject: AnySubject, claims: TClaims): Subject<TClaims, TArgs> {
  const newSubject = {
    ...subject,
    claims: claims,
    wrap: (newClaims: TClaims) => setClaims(newSubject, newClaims),
  }

  return newSubject
}

export function createSubject<
  TClaims = never,
  TArgs extends unknown[] = [TClaims],
>(
  name: string,
  options?: CreateSubjectOptions<TClaims, TArgs>,
): Subject<TClaims>
export function createSubject<
  TClaims = never,
  TArgs extends unknown[] = [TClaims],
>(
  options?: CreateSubjectOptions<TClaims, TArgs>,
): Subject<TClaims, TArgs>
export function createSubject<
  TClaims = never,
  TArgs extends unknown[] = [TClaims],
>(
  nameOrOptions: string | CreateSubjectOptions<TClaims, TArgs> = {},
  options: CreateSubjectOptions<TClaims, TArgs> = {},
): Subject<TClaims, TArgs> {
  const id = randomId()
  const isDynamic = typeof nameOrOptions !== "string"
    ? true
    : undefined
  const name = typeof nameOrOptions === "string"
    ? nameOrOptions
    : id
  const from = typeof nameOrOptions === "string"
    ? options.from
    : nameOrOptions.from

  const subject: Subject<TClaims, TArgs> = {
    __brand: "subject",
    __dynamic: isDynamic,

    id: id,
    name: name,

    wrap: (claims: TClaims) => setClaims(subject, claims),

    from: (...args: TArgs) => {
      const claims = typeof from === "function"
        ? from(...args)
        : args[0] as TClaims

      return subject.wrap(claims)
    },
  }

  return subject
}
