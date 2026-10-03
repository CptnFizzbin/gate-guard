import { describe, expect, test, vi } from "vitest"

import { ConditionResolver } from "./conditionResolver.ts"
import { PolicyArgumentError, PolicyLoadException, PolicyTypeMismatchError } from "../errors/index.ts"
import type { Logger } from "../lib/logger.ts"
import { createOperator } from "./operators/operator.ts"

function mockLogger() {
  return { info: vi.fn<Logger["info"]>(), warn: vi.fn<Logger["warn"]>(), error: vi.fn<Logger["error"]>() }
}

describe("ConditionResolver", () => {
  test("an array condition fails closed instead of matching its indices as fields", () => {
    const logger = mockLogger()
    const resolver = new ConditionResolver([], logger)

    expect(resolver.evaluate({ 0: "a" }, ["a"] as never)).toBe(false)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("received an array"))
  })

  test("type-mismatch diagnostics go to the logger it was constructed with", () => {
    const logger = mockLogger()
    const resolver = new ConditionResolver([], logger)

    expect(resolver.evaluate({ n: 1 }, { n: { $gt: "x" } } as never)).toBe(false)
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  test("without a logger, diagnostics are discarded", () => {
    const resolver = new ConditionResolver()

    expect(resolver.evaluate({ n: 1 }, { n: { $gt: "x" } } as never)).toBe(false)
  })

  test("a custom operator throwing PolicyTypeMismatchError evaluates to false and is logged", () => {
    const logger = mockLogger()
    const $strict = createOperator("$strict", () => {
      throw new PolicyTypeMismatchError({ value: { expected: "a", received: "b" } })
    })
    const resolver = new ConditionResolver([$strict], logger)

    expect(resolver.evaluate({}, { $strict: 1 } as never)).toBe(false)
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  test("rejects an operator whose name isn't $-prefixed", () => {
    const bad = { name: "hasRole", resolve: () => true } as never
    expect(() => new ConditionResolver([bad])).toThrow(PolicyArgumentError)
    expect(() => createOperator("hasRole" as never, () => true)).toThrow(PolicyArgumentError)
  })

  test("rejects a custom operator shadowing a built-in", () => {
    expect(() => new ConditionResolver([createOperator("$eq", () => true)])).toThrow(PolicyLoadException)
  })
})
