# Code comments

Every comment in the codebase is one of three styles — **Documentation**, **Explanation**, or **Task**. Comments
that don't fit any style (or that mix them) should be rewritten or removed. The rules apply equally to the JavaScript
(`impl/js`) and Java (`impl/java`) implementations.

**Documentation** comments describe a class, function, method, or field

- MUST be a `/**` doc block (JSDoc in TypeScript, Javadoc in Java) immediately above the declaration
- MUST NOT refer to old versions of the code (no "used to be", "previously", "renamed from", "legacy" framing) —
  document what the code *is*, not its history. History belongs in commit messages, changesets, or the changelog.
- MUST NOT include implementation details — describe the contract (what it's for, inputs/outputs, invariants
  callers can rely on), not how the body is written internally. If the implementation changes, the doc shouldn't
  need to.
- SHOULD include a usage example when the usage isn't self-evident from the signature alone.

```ts
// ✅ — describes the contract, no history, no internals
/** Returns `true` when `policy` allows `action` on `subject`; the last matching rule wins. */
export const can = (policy: Policy, action: string, subject: Subject): boolean => { ... }

// ❌ — refers to an old version of the code
/** Checks the rule. Replaces the old first-match evaluation from before the spec rework. */

// ❌ — implementation detail instead of contract
/** Loops over the rules in reverse and returns on the first match. */
```

**Explanation** comments describe a line or block of code:

- MUST use an inline `//` above or beside it
- MUST NOT explain what the code does — if the code needs a line-by-line narration, prefer making the code clearer
  (better names, extracted helper) over commenting it.
- MUST explain *why* the code is there and what problem it fixed — the non-obvious reason the line exists in the
  form it does.
- SHOULD reference a GitHub issue when one exists.

```ts
// ✅ — explains why, references the issue
// Compare with Object.is so NaN matches NaN, which the spec requires for $eq
// across every implementation. See #123.
return Object.is(actual, expected)

// ❌ — narrates what the line does
// Check if actual equals expected
return Object.is(actual, expected)
```

**Task** comments (`// TODO` / `// FIXME`) flag outstanding work or a known defect at the line they sit on:

- MUST use an inline `// TODO:` (planned work not yet done) or `// FIXME:` (known defect in code that already
  ships) prefix, above or beside the line it concerns.
- MUST state what's outstanding, specifically enough that someone other than the author could act on it without
  asking. "TODO: fix this" isn't specific enough.
- SHOULD reference a GitHub issue when the task is non-trivial enough to track independently of the comment itself.
- MUST NOT be used to narrate finished work, or as a substitute for an Explanation comment justifying why the
  current code is correct as written — a Task comment marks something that still needs doing, not something that's
  done and merely worth knowing about.

```java
// ✅ — specific about what's outstanding, references the issue
// TODO: accept policy spec 1.1 once the $regex operator lands (#145)
private static final String SUPPORTED_SPEC = "1.0";

// ✅ — flags a known defect, not just a stylistic gripe
// FIXME: BigDecimal fields fall through to the non-numeric branch, so $gt never matches them — see #211
if (value instanceof Number number) { ... }

// ❌ — too vague to act on
// TODO: fix this later
```

**Exemptions** — these don't need to fit any style:

- `// Arrange` / `// Act` / `// Assert` section labels in tests — they're structural section labels, not
  documentation or explanation.
- Tool directives such as `// eslint-disable-next-line`, `// @ts-expect-error`, or `// CHECKSTYLE:OFF` — they
  instruct tooling, not readers.
