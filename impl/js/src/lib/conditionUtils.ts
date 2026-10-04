import type { AnyCondition } from "../conditions/condition.ts"

export function collectOperators(
  condition: AnyCondition,
): Set<string> {
  let operators = new Set<string>()

  if (!condition) return operators
  if (typeof condition !== "object") return operators

  for (const [key, value] of Object.entries(condition)) {
    if (key.startsWith("$")) {
      operators.add(key)
    }

    if (key === "$field") {
      if (!Array.isArray(value)) continue

      const [_fieldName, fieldConfiditon] = value
      operators = operators.union(collectOperators(fieldConfiditon))
      continue
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        operators = operators.union(collectOperators(v))
      }
      continue
    }

    if (typeof value === "object") {
      operators = operators.union(collectOperators(value))
    }
  }

  return operators
}
