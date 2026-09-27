import { describe, expect, test } from "vitest"

import {
  PolicyArgumentError,
  PolicyError,
  PolicyLoadException,
  PolicyTypeMismatchError,
  PolicyVersionException,
} from "./index.ts"

describe("error hierarchy", () => {
  test.each([
    { error: new PolicyArgumentError("x"), name: "PolicyArgumentError" },
    { error: new PolicyLoadException("x"), name: "PolicyLoadException" },
    { error: new PolicyVersionException("x"), name: "PolicyVersionException" },
    { error: new PolicyTypeMismatchError({ value: { expected: "a", received: "b" } }), name: "PolicyTypeMismatchError" },
  ])("$name is a PolicyError with its own name", ({ error, name }) => {
    expect(error).toBeInstanceOf(PolicyError)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe(name)
  })
})
