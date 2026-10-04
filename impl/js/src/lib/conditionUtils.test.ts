import { describe, expect, test } from "vitest"

import { collectOperators } from "./conditionUtils.ts"

describe("collectOperators", () => {
  test.each([
    { name: "a string", condition: "admin" },
    { name: "a number", condition: 5 },
    { name: "a boolean", condition: true },
    { name: "undefined", condition: undefined },
    { name: "an empty object", condition: {} },
    { name: "an empty array", condition: [] },
    { name: "a plain field match", condition: { status: "published" } },
  ])("returns an empty set for $name", ({ condition }) => {
    expect(collectOperators(condition as never)).toEqual(new Set())
  })

  test("returns an empty set for null without throwing", () => {
    expect(collectOperators(null as never)).toEqual(new Set())
  })

  test.each([
    {
      condition: { $eq: 1 },
      expected: ["$eq"],
    },
    {
      condition: { $gt: 1, $lt: 5 },
      expected: ["$gt", "$lt"],
    },
    {
      condition: { $in: [1, 2, 3] },
      expected: ["$in"],
    },
    {
      condition: { $substr: "abc" },
      expected: ["$substr"],
    },
  ])(
    "collects top-level operators from $condition",
    ({ condition, expected }) => {
      expect(collectOperators(condition)).toEqual(new Set(expected))
    },
  )

  test("does not collect plain field names", () => {
    expect(collectOperators({ status: { $eq: "a" } })).toEqual(new Set(["$eq"]))
  })

  test("collects operators nested in a field condition", () => {
    expect(collectOperators({ age: { $gte: 18 } })).toEqual(new Set(["$gte"]))
  })

  test("collects operators nested at multiple object levels", () => {
    expect(collectOperators({ a: { b: { $ne: 1 } } })).toEqual(new Set(["$ne"]))
  })

  test.each([
    {
      name: "$and",
      condition: { $and: [{ a: { $eq: 1 } }, { b: { $gt: 2 } }] },
      expected: ["$and", "$eq", "$gt"],
    },
    {
      name: "$or",
      condition: { $or: [{ a: { $eq: 1 } }, { b: { $lt: 2 } }] },
      expected: ["$or", "$eq", "$lt"],
    },
    {
      name: "$not",
      condition: { $not: { a: { $eq: 1 } } },
      expected: ["$not", "$eq"],
    },
    { name: "empty $and", condition: { $and: [] }, expected: ["$and"] },
  ])(
    "collects the logical operator and its children for $name",
    ({ condition, expected }) => {
      expect(collectOperators(condition)).toEqual(new Set(expected))
    },
  )

  test("collects operators nested through logical operators", () => {
    const condition = {
      $and: [
        {
          $or: [
            { a: { $eq: 1 } },
            { $not: { b: { $in: [1] } } }],
        }],
    }

    expect(collectOperators(condition))
      .toEqual(new Set(["$and", "$or", "$not", "$eq", "$in"]))
  })

  test("deduplicates repeated operators", () => {
    const condition = {
      $or: [
        { a: { $eq: 1 } },
        { b: { $eq: 2 } },
        { c: { $eq: 3 } }],
    }

    expect(collectOperators(condition)).toEqual(new Set(["$or", "$eq"]))
  })

  test("tolerates null and primitive entries inside logical arrays", () => {
    expect(collectOperators({ $and: [null, 1, "x", { $ne: 1 }] }))
      .toEqual(new Set(["$and", "$ne"]))
  })

  test("tolerates a null value under an operator", () => {
    expect(collectOperators({ $not: null })).toEqual(new Set(["$not"]))
  })

  test("collects operators from a $has condition", () => {
    expect(collectOperators({ tags: { $has: "a" } })).toEqual(new Set(["$has"]))
  })

  test("collects operators inside an $in array of objects", () => {
    expect(collectOperators({ $in: [{ $eq: 1 }] }))
      .toEqual(new Set(["$in", "$eq"]))
  })

  describe("$field", () => {
    test("collects $field and the operators of its field condition", () => {
      expect(collectOperators({ $field: ["age", { $gte: 18 }] }))
        .toEqual(new Set(["$field", "$gte"]))
    })

    test("collects logical operators inside the field condition", () => {
      const condition = { $field: ["age", { $or: [{ $lt: 5 }, { $gt: 10 }] }] }

      expect(collectOperators(condition))
        .toEqual(new Set(["$field", "$or", "$lt", "$gt"]))
    })

    test("ignores the field name when it looks like an operator", () => {
      expect(collectOperators({ $field: ["$weird", { $eq: 1 }] }))
        .toEqual(new Set(["$field", "$eq"]))
    })

    test("collects only $field for a plain value in the tuple", () => {
      expect(collectOperators({ $field: ["name", "bob"] }))
        .toEqual(new Set(["$field"]))
    })

    test("collects only $field when the value is not a tuple", () => {
      expect(collectOperators({ $field: "name" })).toEqual(new Set(["$field"]))
      expect(collectOperators({ $field: { $eq: 1 } }))
        .toEqual(new Set(["$field"]))
    })

    test("collects only $field for an empty tuple", () => {
      expect(collectOperators({ $field: [] })).toEqual(new Set(["$field"]))
    })

    test("collects $field nested in a logical operator", () => {
      const condition = {
        $and: [
          { $field: ["a", { $eq: 1 }] },
          { $field: ["b", { $ne: 2 }] }],
      }

      expect(collectOperators(condition))
        .toEqual(new Set(["$and", "$field", "$eq", "$ne"]))
    })
  })
})
