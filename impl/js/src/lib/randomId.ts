export function randomId(): string {
  // Reached via globalThis, not `crypto` or `node:crypto`: this package runs
  // in browsers and Node, and with `lib: ["ES2025"]` (no "DOM") neither
  // environment's ambient types declare the global both runtimes provide.
  return (globalThis as unknown as { crypto: { randomUUID(): string } }).crypto.randomUUID()
}
