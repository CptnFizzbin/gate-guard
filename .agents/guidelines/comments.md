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
/** Returns whether `action` is allowed on `subject`: the last-declared matching rule decides, and no match means deny. */
can(action: TActions, subject: TSubjects): boolean { ... }

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

```java
// ✅ — explains why the obvious approach (Number.equals) is wrong here
// Not Number.equals: Integer.equals(Long) is always false, but a claims field
// declared long must equal the Integer a JSON/YAML parser produces for the
// same literal.
if (isFloatingPoint(a) || isFloatingPoint(b)) { ... }

// ❌ — narrates what the line does
// Compare the two numbers
return toBigDecimal(a).compareTo(toBigDecimal(b)) == 0;
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

```ts
// ✅ — specific about what's outstanding and when it can be done
// TODO: switch back to "detect" once eslint-plugin-react supports ESLint 10;
// "detect" calls context.getFilename(), which ESLint 10 removed.
version: "19.0",
```

```java
// ✅ — flags a known defect and references the issue
// FIXME: emitMeta(false) drops anyAction/anySubject too, so a configured
// wildcard token silently stops matching - see #49
.meta(config.emitMeta() ? buildMeta() : null);

// ❌ — too vague to act on
// TODO: fix this later
```

**Exemptions** — these don't need to fit any style:

- `// Arrange` / `// Act` / `// Assert` section labels in tests — they're structural section labels, not
  documentation or explanation.
- Section labels that group related tests (`// --- KeycardConfig.emitMeta ---`) — like Arrange/Act/Assert, they're
  structure rather than documentation or explanation. Keep them short, put them directly above the first member of
  their group, and only add one when the group isn't already obvious from the names below it.
- Tool directives such as `// eslint-disable-next-line`, `// @ts-expect-error`, or `// CHECKSTYLE:OFF` — they
  instruct tooling, not readers.
