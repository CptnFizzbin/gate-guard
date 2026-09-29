import { describe, expect, test } from "vitest"

import { ConditionResolver } from "../../conditionResolver.ts"

describe("$or", () => {
  const resolver = new ConditionResolver()

  test.each([
    { subject: { left: 1, right: 1 }, condition: { $or: [{ left: 2 }, { right: 1 }] }, expected: true },
    { subject: { left: 1, right: 1 }, condition: { $or: [{ left: 2 }, { right: 2 }] }, expected: false },
    { subject: { left: 1, right: 1 }, condition: { $or: [] }, expected: false },
    { subject: { left: 1 }, condition: { $or: "not an array" }, expected: false },
    // null is an ordinary value, not a reason to short-circuit
    { subject: { f: null }, condition: { f: { $or: [null] } }, expected: true },
    { subject: { f: null }, condition: { f: { $or: ["open", null] } }, expected: true },
    { subject: { f: null }, condition: { f: { $or: ["open"] } }, expected: false },
  ])(`$condition with $subject -> $expected`, ({ subject, condition, expected }) => {
    expect(resolver.evaluate(subject, condition as never)).toBe(expected)
  })

  test("$not over an empty $and agrees with $and on a null value", () => {
    expect(resolver.evaluate({ f: null }, { f: { $not: { $and: [] } } } as never)).toBe(false)
  })
})
