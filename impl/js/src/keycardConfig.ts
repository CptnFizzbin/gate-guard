import type { Action, ActionCatalog } from "./action/index.ts"
import type { AnyOperator, OperatorCatalog } from "./conditions/operators/operator.ts"
import type { Logger } from "./lib/logger.ts"
import type { Subject, SubjectCatalog, SubjectFieldMapperCatalog } from "./subject/index.ts"

/** Config shared by `Policy` and `PolicyBuilder`, so one object can be handed to both. */
export interface KeycardConfig<TOperators extends AnyOperator = never> {
  // actions/subjects/anyAction/anySubject are typed against the base
  // Action/Subject rather than a builder's TActions/TSubjects: tying them to
  // those generics would infer TActions/TSubjects from this config alone and
  // narrow what allow/deny accept everywhere else on the same builder.

  /**
   * Declared action vocabulary, additive to `meta.actions`. Each key is its
   * entry's serialized name and always wins over the entry's own name, which
   * is how a nameless `createAction()` gets a stable name.
   */
  actions?: ActionCatalog
  /** Declared subject vocabulary, additive to `meta.subjects` - see `actions`, symmetric for Subjects. */
  subjects?: SubjectCatalog
  /** Custom operators to register alongside the built-ins. */
  operators?: TOperators[] | OperatorCatalog
  /**
   * The action wildcard token - undeclared by default, in which case
   * `PolicyBuilder`'s built `meta.anyAction` comes out undeclared too (the
   * `"_ANY_"` default then applies). An explicit `null` or `false` disables
   * the action wildcard entirely, distinct from leaving this unset.
   */
  anyAction?: Action | string | false | null
  /** The subject wildcard token, symmetric with `anyAction`. */
  anySubject?: Subject | string | false | null
  /** SubjectFieldMappers registered by subject name - consulted when the Subject in hand doesn't carry its own `fieldMapper`. */
  mapper?: SubjectFieldMapperCatalog
  /**
   * Logger for non-fatal diagnostics: condition type mismatches and malformed
   * conditions during evaluation, and an unregistered dynamic Action/Subject
   * passed to `.can()`/`.cannot()`/`.require()`. Defaults to the module-level
   * logger set via `setLogger()`.
   */
  logger?: Logger
  /**
   * When `true` (the default), KeyCard runs fail-fast catalog checks -
   * `PolicyBuilder`/`Policy` reject one Action/Subject registered under two
   * catalog keys, `allow()`/`deny()` reject a dynamic Action/Subject that isn't
   * registered, and `Policy` rejects a definition that doesn't satisfy its own
   * `meta.actions`/`meta.subjects`/`meta.operators` - and a built
   * `PolicyDefinition` includes the diagnostic `meta.actions`/`meta.subjects`/
   * `meta.operators`. Set `false` to skip both, e.g. in production once CI has
   * run the checks. `meta.anyAction`/`meta.anySubject` are always emitted when
   * non-default, since evaluation depends on them.
   */
  emitMeta?: boolean
}
