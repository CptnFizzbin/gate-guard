import { PolicyTypeMismatchError } from "../../../errors/policyTypeMismatchError.ts"
import { escapeRegExp } from "../../../lib/regex.ts"
import { createOperator } from "../operator.ts"

/**
 * Compiled patterns, keyed by their `$substr` source. Patterns come from
 * policy documents, so the set in play is small and stable - but it's
 * still bounded, and simply cleared once full, so a process that loads
 * many distinct policies over its lifetime can't grow it without limit.
 */
const compiledPatterns = new Map<string, RegExp>()
const MAX_COMPILED_PATTERNS = 1000

/**
 * Compiles a `$substr` pattern to an equivalent native `RegExp` - throws
 * {@link PolicyTypeMismatchError} for a structurally invalid one (a `^`
 * anywhere but first, a `$` anywhere but last).
 */
function compilePattern(pattern: string): RegExp {
  let regexPattern = ""
  for (let i: number = 0; i < pattern.length; i++) {
    const char = pattern[i]
    const next = pattern[i + 1]

    switch (char) {
      case "\\":
        // A trailing "\" with nothing after it is ignored.
        if (!next) break

        regexPattern += escapeRegExp(next)
        i++ // skip next

        break
      case "*":
        regexPattern += ".*"
        break
      case "^":
        // Only meaningful as the pattern's first character - anywhere
        // else it's a structurally invalid pattern.
        if (i !== 0) throw new PolicyTypeMismatchError({
          value: { expected: "'^' only as the first character", received: `'^' at position ${i}` },
        })
        regexPattern += "^"
        break
      case "$":
        // Only meaningful as the pattern's last character.
        if (i !== pattern.length - 1) throw new PolicyTypeMismatchError({
          value: { expected: "'$' only as the last character", received: `'$' at position ${i}` },
        })
        regexPattern += "$"
        break
      default:
        regexPattern += escapeRegExp(char)
    }
  }

  // The "s" flag makes "." match newlines too, so a wildcard is truly
  // "any character", per the requirement that lazy/greedy wildcards be
  // match-equivalent (both just need one gap-filling run of characters).
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
 * `$substr` - a small, deliberately non-regex substring pattern
 * language, compiled here to a native `RegExp` (the spec explicitly
 * permits this: implementations MAY implement `$substr` however they
 * like internally, including compiling it to the host language's regex
 * engine, as long as the observable match/no-match result agrees with
 * the spec for every subject/pattern). Each distinct pattern is compiled
 * once and cached.
 */
export const SubstrOperator = createOperator("$substr", (subject, pattern) => {
  if (subject === null || subject === undefined) return false

  if (typeof pattern !== "string") throw new PolicyTypeMismatchError({
    value: {
      expected: "string",
      received: typeof pattern,
    },
  })

  // No "g"/"y" flag, so the cached RegExp carries no lastIndex state between calls.
  return getCompiledPattern(pattern).test(String(subject))
})
