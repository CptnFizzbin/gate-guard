/**
 * Per-field getters for a Subject's wrapped instance, used in place of reading
 * `instance[fieldName]` directly. Lets a condition reference a field whose
 * name doesn't match the instance's own shape (a rename, a computed value) or
 * an instance that isn't a plain object. A field this mapper doesn't define
 * falls back to ordinary property access.
 */
export type SubjectFieldMapper<TData = unknown> = Record<string, (instance: TData) => unknown>
