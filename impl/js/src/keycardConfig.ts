import type { Action, ActionsRecord } from "./action/index.ts"
import type { AnyOperator, OperatorsRecord } from "./conditions/operators/operator.ts"
import type { Logger } from "./lib/logger.ts"
import { noopLogger } from "./lib/logger.ts"
import { DEFAULT_WILDCARD } from "./policy/wildcards.ts"
import type { Subject, SubjectsRecord } from "./subject/index.ts"

/** Config shared by `Policy` and `PolicyBuilder`, so one object can be handed to both. */
export interface KeycardConfig<TOperators extends AnyOperator = AnyOperator> {
  /**
   * Declared action vocabulary, additive to `meta.actions`. Each key is its
   * entry's serialized name and always wins over the entry's own name, which
   * is how a nameless `createAction()` gets a stable name.
   */
  actions?: ActionsRecord

  /** Declared subject vocabulary, additive to `meta.subjects` - see `actions`, symmetric for Subjects. */
  subjects?: SubjectsRecord

  /** Custom operators to register alongside the built-ins. */
  operators?: TOperators[] | OperatorsRecord

  /**
   * The action wildcard token - undeclared by default, in which case
   * `PolicyBuilder`'s built `meta.anyAction` comes out undeclared too (the
   * `"_ANY_"` default then applies). An explicit `null` or `false` disables
   * the action wildcard entirely, distinct from leaving this unset.
   */
  anyAction?: Action | string | false | null

  /** The subject wildcard token, symmetric with `anyAction`. */
  anySubject?: Subject | string | false | null

  /**
   * Logger for non-fatal diagnostics: condition type mismatches and malformed
   * conditions during evaluation, and an unregistered dynamic Action/Subject
   * passed to `.can()`/`.cannot()`/`.require()`. Diagnostics are discarded
   * when unset.
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

export const defaultKeycardConfig: KeycardConfig = {
  anyAction: DEFAULT_WILDCARD,
  anySubject: DEFAULT_WILDCARD,
  logger: noopLogger,
  emitMeta: true,
  actions: undefined,
  subjects: undefined,
  operators: undefined,
} as const
