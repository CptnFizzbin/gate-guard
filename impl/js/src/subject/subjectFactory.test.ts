import { describe, expect, test } from "vitest"

import { createSubject } from "./subjectFactory.ts"

describe("createSubject()", () => {
  test("called with a name behaves as before - not dynamic", () => {
    const subject = createSubject("Article")

    expect(subject.name).toBe("Article")
    expect(subject.__dynamic).toBeUndefined()
  })

  test("called with no name generates a random, usable id and marks it dynamic", () => {
    const subject = createSubject()

    expect(typeof subject.name).toBe("string")
    expect(subject.name.length).toBeGreaterThan(0)
    expect(subject.__dynamic).toBe(true)
  })

  test("each no-arg call generates a distinct id", () => {
    const a = createSubject()
    const b = createSubject()

    expect(a.name).not.toBe(b.name)
  })

  test("wrap() preserves the generated id and __dynamic marker", () => {
    const subject = createSubject<{ id: number }>()
    const wrapped = subject.wrap({ id: 1 })

    expect(wrapped.name).toBe(subject.name)
    expect(wrapped.__dynamic).toBe(true)
    expect(wrapped.claims).toEqual({ id: 1 })
  })

  test("without a `from` mapper, from() behaves exactly like wrap()", () => {
    const subject = createSubject<{ id: number }>("Article")
    const wrapped = subject.from({ id: 1 })

    expect(wrapped.name).toBe("Article")
    expect(wrapped.claims).toEqual({ id: 1 })
  })

  test("createSubject({ from }) maps one or more raw entities into this Subject's claims shape", () => {
    interface Project {
      id: string
      orgId: string
    }

    interface Task {
      id: string
      assigneeId: string | null
    }

    const TaskSubject = createSubject<{ id: string, orgId: string, assigneeId: string | null }, [Task, Project]>({
      from: (task, project) => ({ id: task.id, orgId: project.orgId, assigneeId: task.assigneeId }),
    })

    const wrapped = TaskSubject.from({ id: "t1", assigneeId: "u1" }, { id: "p1", orgId: "org1" })

    expect(wrapped.__dynamic).toBe(true)
    expect(wrapped.claims).toEqual({ id: "t1", orgId: "org1", assigneeId: "u1" })
  })

  test(
    "createSubject<TData>({ from }) - TData given explicitly, TArgs left to default - matches real-backend.md's usage",
    () => {
      interface Project {
        id: string
        orgId: string
        ownerId: string
        archivedAt: string | null
      }

      interface ProjectClaims {
        id: string
        orgId: string
        ownerId: string
        archived: boolean
      }

      const ProjectSubject = createSubject<ProjectClaims, [Project]>({
        from: (project) => ({
          id: project.id,
          orgId: project.orgId,
          ownerId: project.ownerId,
          archived: project.archivedAt !== null,
        }),
      })

      const wrapped = ProjectSubject.from({ id: "p1", orgId: "org1", ownerId: "u1", archivedAt: null })

      expect(wrapped.claims).toEqual({ id: "p1", orgId: "org1", ownerId: "u1", archived: false })
    },
  )

  test("createSubject({ from }) is registered in a KeycardConfig catalog the same way as any dynamic Subject", () => {
    interface Project {
      id: string
      orgId: string
    }

    const ProjectSubject = createSubject<{ orgId: string }, [Project]>({
      from: (project) => ({ orgId: project.orgId }),
    })

    expect(ProjectSubject.__dynamic).toBe(true)
    expect(typeof ProjectSubject.name).toBe("string")
  })
})
