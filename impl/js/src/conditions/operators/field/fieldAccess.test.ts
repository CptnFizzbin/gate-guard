import { describe, expect, test } from "vitest"

import { hasField } from "./fieldAccess.ts"
import { ConditionResolver } from "../../conditionResolver.ts"

class Article {
  constructor(private readonly title: string) {}

  get upperTitle() {
    return this.title.toUpperCase()
  }

  toString() {
    return `Article(${this.title})`
  }
}

describe("hasField", () => {
  test.each(["constructor", "toString", "hasOwnProperty", "valueOf", "__proto__", "isPrototypeOf"])(
    "Object.prototype's %s is not a field of a plain object",
    (name) => {
      expect(hasField({}, name)).toBe(false)
    },
  )

  test("own properties count, including ones shadowing Object.prototype names", () => {
    expect(hasField({ a: undefined }, "a")).toBe(true)
    expect(hasField({ toString: "x" }, "toString")).toBe(true)
    expect(hasField(JSON.parse(`{"constructor": 1}`), "constructor")).toBe(true)
  })

  test("members a class declares count, even though they're inherited", () => {
    const article = new Article("hello")
    expect(hasField(article, "upperTitle")).toBe(true)
    expect(hasField(article, "toString")).toBe(true)
    expect(hasField(article, "constructor")).toBe(false)
  })

  test("a null-prototype object has only its own fields", () => {
    const bare = Object.assign(Object.create(null), { a: 1 })
    expect(hasField(bare, "a")).toBe(true)
    expect(hasField(bare, "toString")).toBe(false)
  })
})

describe("field conditions on Object.prototype names", () => {
  const resolver = new ConditionResolver()

  test("a condition on an inherited Object.prototype name is a missing field", () => {
    expect(resolver.evaluate({}, { hasOwnProperty: { $not: { $eq: 1 } } })).toBe(false)
    expect(resolver.evaluate({}, { constructor: { $not: { $eq: null } } })).toBe(false)
    expect(resolver.evaluate({}, { toString: { $ne: 1 } })).toBe(true)
  })
})
