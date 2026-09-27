import { describe, expect, test } from "vitest"

import { Policy } from "./policy.ts"
import type { PolicyDefinition } from "./policyDefinition.ts"
import { createAction } from "../action/index.ts"
import { PolicyError, PolicyLoadException, PolicyVersionException } from "../errors/index.ts"
import { createSubject } from "../subject/index.ts"

const Read = createAction("Read")
const Article = createSubject("Article")

/** Hands `Policy.from` a value the type system wouldn't allow - these tests are about malformed, untyped input. */
function load(definition: unknown) {
  return Policy.from(definition as PolicyDefinition)
}

describe("Policy: document envelope", () => {
  test.each([
    { name: "null", definition: null },
    { name: "an array", definition: [] },
    { name: "missing rules", definition: { version: "0.1" } },
    { name: "non-array rules", definition: { version: "0.1", rules: {} } },
    { name: "null meta", definition: { version: "0.1", meta: null, rules: [] } },
    { name: "array meta", definition: { version: "0.1", meta: [], rules: [] } },
  ])("throws PolicyLoadException (not TypeError) for $name", ({ definition }) => {
    expect(() => load(definition)).toThrow(PolicyLoadException)
  })

  test("rejects a rule tuple with more than four elements", () => {
    expect(() => load({ version: "0.1", rules: [["allow", "Read", "Article", {}, "extra"]] })).toThrow(PolicyLoadException)
  })
})

describe("Policy: version validation", () => {
  test.each([
    { name: "missing", version: undefined },
    { name: "a number", version: 0.1 },
    { name: "arbitrary text around a version", version: "banana 0.1 xyz" },
    { name: "empty", version: "" },
    { name: "a leading v", version: "v0.1" },
  ])("throws PolicyVersionException for a $name version", ({ version }) => {
    expect(() => load({ version, rules: [] })).toThrow(PolicyVersionException)
  })

  test("reports the raw version in the error message", () => {
    expect(() => load({ rules: [] })).toThrow(/Invalid policy version undefined/)
    expect(() => load({ version: "9.0", rules: [] })).toThrow(/"9\.0"/)
  })

  test.each(["0", "0.1", "0.1.0", "0.1.7", "0.1.0-alpha.1", "0.1.0+build.5"])("accepts %s", (version) => {
    expect(() => load({ version, rules: [] })).not.toThrow()
  })
})

// Spec: https://keycard.cptnfizzbin.dev/spec/v0#metaanyaction--metaanysubject
describe("Policy: meta.anyAction / meta.anySubject", () => {
  test.each([true, 5, [], {}])("throws PolicyLoadException for a wildcard declared as %j", (declared) => {
    expect(() => load({ version: "0.1", meta: { anyAction: declared }, rules: [] })).toThrow(PolicyLoadException)
    expect(() => load({ version: "0.1", meta: { anySubject: declared }, rules: [] })).toThrow(PolicyLoadException)
  })

  test("false disables the wildcard, same as null", () => {
    const policy = Policy.from({
      version: "0.1",
      meta: { anyAction: false, anySubject: false },
      rules: [["allow", "_ANY_", "_ANY_"]],
    })

    expect(policy.can(Read, Article)).toBe(false)
    expect(policy.can(createAction("_ANY_"), createSubject("_ANY_"))).toBe(true)
  })

  test("with the wildcard disabled via false, a both-sides \"_ANY_\" rule may carry a condition", () => {
    expect(() => Policy.from({
      version: "0.1",
      meta: { anyAction: false, anySubject: false },
      rules: [["allow", "_ANY_", "_ANY_", { owner_id: 1 }]],
    })).not.toThrow()
  })
})

// Spec: https://keycard.cptnfizzbin.dev/spec/v0#metaactions--metasubjects
describe("Policy: meta catalogs", () => {
  test.each(["actions", "subjects", "operators"])("meta.%s entries MUST be unique", (field) => {
    const entry = field === "operators" ? "$hasRole" : "Read"
    expect(() => load({ version: "0.1", meta: { [field]: [entry, entry] }, rules: [] })).toThrow(PolicyLoadException)
  })

  test.each(["actions", "subjects", "operators"])("meta.%s must be an array of strings", (field) => {
    expect(() => load({ version: "0.1", meta: { [field]: "Read" }, rules: [] })).toThrow(PolicyLoadException)
    expect(() => load({ version: "0.1", meta: { [field]: [1] }, rules: [] })).toThrow(PolicyLoadException)
  })

  test("meta.operators entries must be $-prefixed", () => {
    expect(() => load({ version: "0.1", meta: { operators: ["hasRole"] }, rules: [] })).toThrow(PolicyLoadException)
  })

  test("the uniqueness/shape checks still run with emitMeta: false", () => {
    expect(() => Policy.from(
      { version: "0.1", meta: { operators: ["$eq"] }, rules: [] },
      { emitMeta: false },
    )).toThrow(PolicyLoadException)
  })
})

describe("Policy: definition isolation", () => {
  test("mutating the definition passed in doesn't affect the Policy", () => {
    const definition: PolicyDefinition = { version: "0.1", rules: [["allow", "Read", "Article", { owner_id: 1 }]] }
    const policy = Policy.from(definition)

    definition.rules.push(["allow", "Read", "Article"])
    ;(definition.rules[0][3] as Record<string, unknown>).owner_id = 2

    expect(policy.can(Read, Article)).toBe(false)
    expect(policy.can(Read, Article.wrap({ owner_id: 1 }))).toBe(true)
  })

  test("mutating a def() result doesn't affect the Policy, and bypasses no validation", () => {
    const policy = Policy.from({ version: "0.1", rules: [["deny", "Read", "Article"]] })

    policy.def().rules.push(["allow", "Read", "Article"])

    expect(policy.def().rules).toHaveLength(1)
    expect(policy.can(Read, Article)).toBe(false)
  })

  test("def() preserves the input's own fields, including opaque meta.application by reference", () => {
    const application = { owner: "billing" }
    const definition = {
      version: "0.1.3",
      name: "n",
      meta: { actions: ["Read"], application },
      rules: [["allow", "Read", "Article"]],
    } satisfies PolicyDefinition

    const def = Policy.from(definition).def()

    expect(def).toEqual(definition)
    expect(def.meta?.application).toBe(application)
  })
})

describe("errors", () => {
  test("every KeyCard load/version error is a PolicyError", () => {
    expect(() => load({ rules: [] })).toThrow(PolicyError)
    expect(() => load({ version: "0.1" })).toThrow(PolicyError)
  })
})
