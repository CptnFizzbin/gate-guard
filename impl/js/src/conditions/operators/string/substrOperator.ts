import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import { escapeRegExp } from "../../../lib/regex.ts"
import { createOperator } from "../operator.ts"

// Bounded, and simply cleared once full: patterns come from policy documents,
// so the working set is small, but a long-lived process can load many
// distinct policies.
const compiledPatterns = new Map<string, RegExp>()
const MAX_COMPILED_PATTERNS = 1000

function compilePattern(pattern: string): RegExp {
  let regexPattern = ""
  for (let i: number = 0; i < pattern.length; i++) {
    const char = pattern[i]
    const next = pattern[i + 1]

    switch (char) {
      case "\\":
        if (!next) break

        regexPattern += escapeRegExp(next)
        i++

        break
      case "*":
        regexPattern += ".*"
        break
      case "^":
        if (i !== 0) throw new PolicyTypeMismatchError({
          value: { expected: "'^' only as the first character", received: `'^' at position ${i}` },
        })
        regexPattern += "^"
        break
      case "$":
        if (i !== pattern.length - 1) throw new PolicyTypeMismatchError({
          value: { expected: "'$' only as the last character", received: `'$' at position ${i}` },
        })
        regexPattern += "$"
        break
      default:
        regexPattern += escapeRegExp(char)
    }
  }

  // "s" so * also spans newlines - a wildcard means any character.
  return new RegExp(regexPattern, "s")
}

function getCompiledPattern(pattern: string): RegExp {
  let regex = compiledPatterns.get(pattern)
  if (!regex) {
    regex = compilePattern(pattern)
    if (compiledPatterns.size >= MAX_COMPILED_PATTERNS) compiledPatterns.clear()
    compiledPatterns.set(pattern, regex)
  }
  return regex
}

/**
 * `$substr` - matches the subject's string form against a small, non-regex
 * pattern: `*` matches any run of characters, a leading `^` or trailing `$`
 * anchors the match, and `\` escapes the next character. Unanchored
 * patterns match anywhere in the subject.
 *
 * ```ts
 * { title: { $substr: "^Draft:*" } }
 * ```
 */
export const SubstrOperator = createOperator("$substr", (subject, pattern) => {
  if (subject === null || subject === undefined) return false

  if (typeof pattern !== "string") throw new PolicyTypeMismatchError({
    value: {
      expected: "string",
      received: typeof pattern,
    },
  })

  // Safe to reuse a cached RegExp: without the "g"/"y" flags, test() keeps no
  // lastIndex state between calls.
  return getCompiledPattern(pattern).test(String(subject))
})
