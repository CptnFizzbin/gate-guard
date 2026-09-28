import { PolicyArgumentError } from "../errors/index.ts"

/** A resolved `ActionCatalog`/`SubjectCatalog`: the reverse name lookup plus every catalog key. */
export interface CatalogResolution {
  /** Raw name (a dynamic Action/Subject's random id, or a named entry's own name) -> catalog key. */
  reverseMap: Map<string, string>
  names: string[]
}

const EMPTY_RESOLUTION: CatalogResolution = { reverseMap: new Map(), names: [] }

/**
 * Resolves a `KeycardConfig.actions`/`.subjects` catalog into a {@link CatalogResolution}.
 *
 * @param kind names the vocabulary ("action"/"subject") in error messages
 * @param validate when false, an entry registered under two keys is not
 *   rejected; the last key wins
 * @throws PolicyArgumentError if `validate` is true and one entry is
 *   registered under more than one key
 */
export function buildCatalog<T extends { name: string }>(
  entries: Record<string, T> | undefined,
  kind: string,
  validate = true,
): CatalogResolution {
  if (entries === undefined) return EMPTY_RESOLUTION

  const reverseMap = new Map<string, string>()
  const names: string[] = []
  for (const [key, entry] of Object.entries(entries)) {
    if (validate) {
      const existingKey = reverseMap.get(entry.name)
      if (existingKey !== undefined && existingKey !== key) {
        throw new PolicyArgumentError(
          `KeycardConfig ${kind} catalog error: the same ${kind} is registered under both "${existingKey}" and "${key}" - a single Action/Subject can only be registered under one catalog key.`,
        )
      }
    }
    reverseMap.set(entry.name, key)
    names.push(key)
  }

  return { reverseMap, names }
}

export function resolveName(reverseMap: Map<string, string>, rawName: string): string {
  return reverseMap.get(rawName) ?? rawName
}
