import { readdirSync } from "node:fs"
import path from "node:path"

import type { Action, Subject } from "../../src/index.ts"
import { createAction, createSubject } from "../../src/index.ts"
import type { JsonValue } from "../../src/lib/json.ts"

/** Returns the absolute paths of `*.yaml` files anywhere under `dir` that satisfy `filterFn`. */
export function listYamlFiles(dir: string, filterFn: (fileName: string) => boolean = () => true): string[] {
  return readdirSync(dir, { recursive: true })
    .map((file) => file.toString())
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => path.resolve(dir, file))
    .filter(filterFn)
}

/** The action argument every fixture-driven suite passes to `Policy.can`. */
export function actionArgFor(name: string): Action {
  return createAction(name)
}

/**
 * The subject argument every fixture-driven suite passes to `Policy.can`:
 * a bare Subject when `claims` is absent, otherwise one wrapping `claims`.
 */
export function subjectArgFor(name: string, claims?: JsonValue): Subject {
  const subject = createSubject(name)
  return claims ? subject.wrap(claims) : subject
}
