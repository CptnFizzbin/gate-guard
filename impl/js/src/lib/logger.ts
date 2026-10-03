/** Sink for KeyCard's non-fatal diagnostics, supplied through `KeycardConfig.logger`. */
export interface Logger {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (error: Error) => void
}

/** Discards everything; used when no `KeycardConfig.logger` is configured. */
export const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
}
