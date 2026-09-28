import { readdirSync } from "node:fs"
import path from "node:path"

import type { Action, Subject } from "../../src/index.ts"
import { createAction, createSubject } from "../../src/index.ts"
import type { JsonValue } from "../../src/lib/json.ts"

export function listYamlFiles(dir: string, filterFn: (fileName: string) => boolean = () => true): string[] {
  return readdirSync(dir, { recursive: true })
    .map((file) => file.toString())
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => path.resolve(dir, file))
    .filter(filterFn)
}

export function actionArgFor(name: string): Action {
  return createAction(name)
}

export function subjectArgFor(name: string, claims?: JsonValue): Subject {
  const subject = createSubject(name)
  // Only an absent third element means "no instance" - null/0/false/""
  // are real instance data and must still be wrapped.
  return claims === undefined ? subject : subject.wrap(claims)
}
