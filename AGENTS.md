# AGENTS.md — KeyCard

A **cross-language access-control library**: one policy format (see [`SPEC.md`](./SPEC.md)), with implementations in
JavaScript/TypeScript (`impl/js`) and Java (`impl/java`). Domain terms are defined in [`GLOSSARY.md`](./GLOSSARY.md).

## Code comments

Every comment is one of three styles — **Documentation** (`/**` JSDoc/Javadoc: the contract, no history or
internals), **Explanation** (inline `//`: *why* the code exists, not what it does), or **Task** (`// TODO:` /
`// FIXME:`: specific outstanding work). Read the full rules and examples in `.agents/guidelines/comments.md` before
writing or editing a comment:

@.agents/guidelines/comments.md

## Type assertions

**Never use `as unknown as T`** (the double type assertion pattern) — ESLint rejects it. The two-step cast bypasses
TypeScript's structural checks entirely and hides real type incompatibilities.

- If two types are structurally compatible, a single `as T` assertion is enough.
- If a value genuinely needs to accept many unrelated shapes, use a targeted `any` in a named alias (with an
  `eslint-disable-next-line @typescript-eslint/no-explicit-any` directive) rather than an assertion at each call site:
  ```ts
  // ✅ — one explicit any in a named alias; no assertion at call sites
  export type AnyOperator = Operator<any, any>

  // ❌ — hides the incompatibility
  const op = operator as unknown as Operator<Article, string>
  ```
