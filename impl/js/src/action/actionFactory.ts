import type { Action } from "./action.ts"
import { randomId } from "../lib/randomId.ts"

export function createAction<T extends string = string>(name?: T): Action<T> {
  const id = randomId()
  if (name === undefined) return { id: id, name: id as T, __brand: "action", __dynamic: true }
  return { id, name, __brand: "action" }
}
