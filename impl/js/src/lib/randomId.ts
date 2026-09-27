/**
 * A random id for a dynamic (no-name) Action/Subject - see
 * `action/action.ts`'s `__dynamic`. Uses the Web Crypto `crypto.randomUUID()`
 * both Node and browsers provide as a global - reached via `globalThis`
 * since this package's `lib` is `ES2025` only (no "DOM"). Falls back to
 * `crypto.getRandomValues()` where `randomUUID` is missing (browsers only
 * expose it in secure contexts): the id only has to be unique within the
 * process, not a spec-conformant UUID.
 */
interface WebCrypto {
  randomUUID?: () => string
  getRandomValues<T extends Uint8Array>(array: T): T
}

export function randomId(): string {
  const { crypto }: { crypto: WebCrypto } = globalThis as typeof globalThis & { crypto: WebCrypto }
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()

  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")
}
