import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import { escapeRegExp } from "../../../lib/regex.ts"
import { createOperator } from "../operator.ts"

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

  const subjectStr = String(subject)

  if (typeof pattern !== "string") throw new PolicyTypeMismatchError({
    value: {
      expected: "string",
      received: typeof pattern,
    },
  })

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
  return !!(new RegExp(regexPattern, "s").exec(subjectStr))
})
