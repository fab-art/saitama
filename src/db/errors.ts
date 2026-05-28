export type PersistenceErrorCode =
  | 'read_failed'
  | 'write_failed'
  | 'not_found'
  | 'quota_exceeded'

/**
 * Typed error surfaced by all repository operations.
 * Callers (stores) can discriminate on `code` to react appropriately.
 * Repositories catch these internally so they never propagate to the UI.
 */
export class PersistenceError extends Error {
  constructor(
    readonly code: PersistenceErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'PersistenceError'
  }
}
