interface WebCrypto {
  randomUUID?: () => string
  getRandomValues<T extends Uint8Array>(array: T): T
}

export function randomId(): string {
  // Reached via globalThis, not `crypto` or `node:crypto`: this package runs
  // in browsers and Node, and with `lib: ["ES2025"]` (no "DOM") neither
  // environment's ambient types declare the global both runtimes provide.
  const { crypto }: { crypto: WebCrypto } = globalThis as typeof globalThis & { crypto: WebCrypto }
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()

  // Browsers only expose randomUUID in secure contexts (HTTPS/localhost). The
  // id only has to be unique within the process, not a conformant UUID.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")
}
