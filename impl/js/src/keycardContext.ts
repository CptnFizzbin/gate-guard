import type { AnyAction } from "./action/action.ts"
import type { ActionsRecord } from "./action/index.ts"
import { createAction } from "./action/index.ts"
import { DefaultOperators } from "./conditions/operators/defaultOperators.ts"
import type { AnyOperator, OperatorName, OperatorsRecord } from "./conditions/operators/operator.ts"
import { assertOperatorName, createOperator } from "./conditions/operators/operator.ts"
import { PolicyArgumentError, PolicyLoadException } from "./errors/index.ts"
import type { KeycardConfig } from "./keycardConfig.ts"
import { defaultKeycardConfig } from "./keycardConfig.ts"
import { Catalog } from "./lib/catalog.ts"
import type { Logger } from "./lib/logger.ts"
import { noopLogger } from "./lib/logger.ts"
import { DEFAULT_WILDCARD } from "./policy/wildcards.ts"
import type { SubjectsRecord } from "./subject/index.ts"
import { createSubject } from "./subject/index.ts"
import type { AnySubject } from "./subject/subject.ts"

export class KeycardContext<TOperators extends AnyOperator = never> {
  public readonly logger: Logger
  public readonly actions: Catalog<AnyAction>
  public readonly subjects: Catalog<AnySubject>
  public readonly operators: Catalog<AnyOperator>
  public readonly emitMeta: boolean

  /** The declared action wildcard token: `false`/`null` when disabled, otherwise its name (the default `"_ANY_"` when undeclared). */
  public readonly anyAction: string | false | null

  /** The declared subject wildcard token, symmetric with {@link anyAction}. */
  public readonly anySubject: string | false | null

  private constructor(config: KeycardConfig<TOperators> = {}) {
    const merged = Object.assign({}, defaultKeycardConfig, config)

    this.logger = merged.logger ?? noopLogger
    this.emitMeta = merged.emitMeta ?? true

    this.actions = this.buildActionsCatalog(merged.actions ?? [], merged.anyAction)
    this.subjects = this.buildSubjectsCatalog(merged.subjects ?? [], merged.anySubject)
    this.operators = this.buildOperatorsCatalog(merged.operators ?? [])

    this.anyAction = KeycardContext.wildcardName(merged.anyAction)
    this.anySubject = KeycardContext.wildcardName(merged.anySubject)
  }

  public static from(config: KeycardContext | KeycardConfig<AnyOperator> = {}) {
    if (config instanceof KeycardContext) return config
    return new KeycardContext(config)
  }

  private static wildcardName(wildcard: { name: string } | string | false | null | undefined): string | false | null {
    if (wildcard === null || wildcard === false) return wildcard
    if (wildcard === undefined) return DEFAULT_WILDCARD
    return typeof wildcard === "string" ? wildcard : wildcard.name
  }

  public static default() {
    return new KeycardContext()
  }

  private assertSingleKey(source: Record<string, { id: string }>, kind: string): void {
    if (!this.emitMeta) return

    const keysById = new Map<string, string>()
    for (const [key, entry] of Object.entries(source)) {
      const existingKey = keysById.get(entry.id)
      if (existingKey !== undefined) {
        throw new PolicyArgumentError(
          `KeycardConfig ${kind} catalog error: the same ${kind} is registered under both "${existingKey}" and "${key}" - a single Action/Subject can only be registered under one catalog key.`,
        )
      }
      keysById.set(entry.id, key)
    }
  }

  private buildActionsCatalog(
    source: ActionsRecord | AnyAction[] | undefined,
    wildcard: AnyAction | string | false | null | undefined,
  ): Catalog<AnyAction> {
    let actionWildcard: AnyAction | null = null
    if (typeof wildcard === "object") {
      actionWildcard = wildcard
    } else if (wildcard) {
      actionWildcard = createAction(wildcard)
    }

    let actions: AnyAction[]
    if (!source) {
      actions = []
    } else if (Array.isArray(source)) {
      actions = source
    } else {
      this.assertSingleKey(source, "action")
      actions = Object.entries(source).map(([name, action]) => {
        return { ...action, name: name }
      })
    }

    return new Catalog(actions, actionWildcard)
  }

  private buildSubjectsCatalog(
    source: SubjectsRecord | AnySubject[] | undefined,
    wildcard: AnySubject | string | false | null | undefined,
  ): Catalog<AnySubject> {
    let subjectWildcard: AnySubject | null
    if (!wildcard) {
      subjectWildcard = null
    } else if (typeof wildcard === "object") {
      subjectWildcard = wildcard
    } else {
      subjectWildcard = createSubject(wildcard)
    }

    let subjects: AnySubject[]
    if (!source) {
      subjects = []
    } else if (Array.isArray(source)) {
      subjects = source
    } else {
      this.assertSingleKey(source, "subject")
      subjects = Object.entries(source).map(([name, subject]) => {
        return { ...subject, name: name }
      })
    }

    return new Catalog(subjects, subjectWildcard)
  }

  private buildOperatorsCatalog(
    source: OperatorsRecord | AnyOperator[] | undefined,
  ): Catalog<AnyOperator> {
    let operators: AnyOperator[]
    if (!source) {
      operators = []
    } else if (Array.isArray(source)) {
      operators = source
    } else {
      operators = Object.entries(source).map(([name, resolver]) => {
        return createOperator(name as OperatorName, resolver)
      })
    }

    const seen = new Set<string>()
    for (const operator of [...DefaultOperators, ...operators]) {
      assertOperatorName(operator.name)
      if (seen.has(operator.name)) {
        throw new PolicyLoadException(
          `Duplicate operator "${operator.name}": an operator with this name is already registered (built-in or custom) - operator names MUST be unique.`,
        )
      }
      seen.add(operator.name)
    }

    return new Catalog([
      ...DefaultOperators,
      ...operators,
    ])
  }
}
