/** A named action - the Action position of a rule. Construct via `createAction`. */
export interface Action<T extends string = string> {
  readonly name: T
  readonly __brand: "action"
  /**
   * Set only by `createAction()` called with no name - `name` then holds a
   * randomly-generated id rather than a developer-chosen name, and this
   * Action MUST be registered (as a catalog value) in the `KeycardConfig`
   * handed to any `PolicyBuilder`/`Policy` that uses it, so its catalog key
   * can resolve to a real, stable, serializable name.
   */
  readonly __dynamic?: true
}

/**
 * A keyed collection of Actions whose keys become the serialized names for
 * their entries - what lets a dynamic (no-name) `createAction()` result be
 * registered with a real, stable name (GLOSSARY.md "Catalog"). Handed to
 * `PolicyBuilder`/`Policy` via `KeycardConfig.actions`.
 */
export type ActionCatalog = Record<string, Action>
