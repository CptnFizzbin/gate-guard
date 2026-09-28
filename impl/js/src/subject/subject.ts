import type { SubjectFieldMapper } from "./subjectFieldMapper.ts"

/** A named subject - the Subject position of a rule. `instance` is `undefined` for a bare type check and set by `.wrap()`/`.from()`. */
export interface Subject<TData = unknown, TArgs extends unknown[] = [TData]> {
  readonly name: string
  readonly instance?: TData
  /** Optional per-field getters for `instance`, set via `createSubject` and carried through `.wrap()`/`.from()` unchanged. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly fieldMapper?: SubjectFieldMapper<any> // `any`, not TData, keeps Subject<TData> covariant in TData
  readonly __brand: "subject"
  /** Set only by `createSubject()` with no name - see `Action.__dynamic`. */
  readonly __dynamic?: true
  /** Returns a new Subject of the same name, wrapping `obj` as its instance. */
  wrap(obj: TData): Subject<TData, TArgs>
  /** Returns a new Subject wrapping the claims `createSubject`'s `from` mapper computes from `args`. */
  from(...args: TArgs): Subject<TData, TArgs>
}

/** A keyed collection of Subjects - see `ActionCatalog`'s doc, symmetric for Subjects. Handed to `PolicyBuilder`/`Policy` via `KeycardConfig.subjects`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubjectCatalog = Record<string, Subject<any, any>>
