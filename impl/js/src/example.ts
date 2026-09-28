import { createAction, createSubject, Policy, PolicyBuilder } from "./index.ts"
import { getLogger } from "./lib/logger.ts"

import type { InferActions, InferSubjects, KeycardConfig } from "./index"

const logger = getLogger()

const Actions = {
  create: createAction("create"),
  read: createAction("read"),
  update: createAction("update"),
  delete: createAction("delete"),
} as const

type AppActions = InferActions<typeof Actions>

const Subjects = {
  article: createSubject<{ id: number, ownerId: number }>("article"),
  comment: createSubject<{ userId: number, articleId: number }>("comment"),
} as const

type AppSubjects = InferSubjects<typeof Subjects>

// One KeycardConfig is shared by every PolicyBuilder/Policy, so the
// action/subject vocabulary is never kept in sync by hand
const config: KeycardConfig = {
  actions: Actions,
  subjects: Subjects,
}

function createUserPolicy(user: { id: number }): Policy<AppActions, AppSubjects> {
  return new PolicyBuilder<AppActions, AppSubjects>(config)
    .allow(Actions.create, Subjects.article)
    .allow(Actions.read, Subjects.article)
    .allow(Actions.update, Subjects.article, { ownerId: user.id })
    .build()
}

const policy = createUserPolicy({ id: 5 })

const ownArticle = Subjects.article.wrap({ id: 1, ownerId: 5 })
const othersArticle = Subjects.article.wrap({ id: 2, ownerId: 6 })

if (policy.can(Actions.create, Subjects.article)) {
  logger.info("✓ Can create articles")
}

if (policy.can(Actions.update, ownArticle)) {
  logger.info("✓ Can update own article")
}

if (policy.can(Actions.update, othersArticle)) {
  logger.info("✓ Can update others' article")
} else {
  logger.info("✗ Cannot update others' article")
}

// PolicyDefinitions are plain JSON - a policy built once can be serialized,
// sent anywhere, and reloaded with the same shared config
const json = JSON.stringify(policy.def())
const def = JSON.parse(json)
const restoredPolicy = new Policy<AppActions, AppSubjects>(def, config)

logger.info(`Restored policy agrees: ${restoredPolicy.can(Actions.update, ownArticle)}`)
