import type { AnyAction } from "./action/action.ts"
import type { ActionsRecord } from "./action/index.ts"
import { createAction } from "./action/index.ts"
import { DefaultOperators } from "./conditions/operators/defaultOperators.ts"
import type { AnyOperator, OperatorName, OperatorsRecord } from "./conditions/operators/operator.ts"
import { createOperator } from "./conditions/operators/operator.ts"
import type { KeycardConfig } from "./keycardConfig.ts"
import { defaultKeycardConfig } from "./keycardConfig.ts"
import { Catalog } from "./lib/catalog.ts"
import type { Logger } from "./lib/logger.ts"
import { noopLogger } from "./lib/logger.ts"
import type { SubjectsRecord } from "./subject/index.ts"
import { createSubject } from "./subject/index.ts"
import type { AnySubject } from "./subject/subject.ts"

export class KeycardContext<TOperators extends AnyOperator = never> {
  public readonly logger: Logger
  public readonly actions: Catalog<AnyAction>
  public readonly subjects: Catalog<AnySubject>
  public readonly operators: Catalog<AnyOperator>
  public readonly emitMeta: boolean

  private constructor(config: KeycardConfig<TOperators> = {}) {
    const merged = Object.assign({}, defaultKeycardConfig, config)

    this.logger = merged.logger ?? noopLogger

    this.actions = this.buildActionsCatalog(merged.actions ?? [], merged.anyAction)
    this.subjects = this.buildSubjectsCatalog(merged.subjects ?? [], merged.anySubject)
    this.operators = this.buildOperatorsCatalog(merged.operators ?? [])

    this.emitMeta = merged.emitMeta ?? true
  }

  public static from(config: KeycardContext | KeycardConfig<AnyOperator> = {}) {
    if (config instanceof KeycardContext) return config
    return new KeycardContext(config)
  }

  public static default() {
    return new KeycardContext()
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

    return new Catalog([
      ...DefaultOperators,
      ...operators,
    ])
  }
}
