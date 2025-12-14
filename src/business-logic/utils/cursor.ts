import type { CursorError } from '../../errors'
import { Buffer } from 'node:buffer'
import { Effect } from 'effect'
import { cursorError } from '../../errors'

/**
 * Encodes a string ID to a base64 cursor for pagination
 * Returns an Effect for API consistency
 */
export function encodeCursor(id: string): Effect.Effect<string, never, never> {
  return Effect.succeed(Buffer.from(id).toString('base64'))
}

/**
 * Decodes a base64 cursor to a string ID for pagination
 * Returns an Effect that can fail with CursorError
 */
export function decodeCursor(cursor: string | undefined): Effect.Effect<string, CursorError, never> {
  if (!cursor) {
    return Effect.fail(cursorError('Cursor is required'))
  }

  return Effect.try({
    try: () => {
      // Validate base64 format first
      if (!/^[A-Z0-9+/]*={0,2}$/i.test(cursor)) {
        throw new Error('Invalid base64 format')
      }

      const decoded = Buffer.from(cursor, 'base64').toString('utf8')

      // Check if the decoded result is valid UTF-8
      if (decoded.includes('\uFFFD')) {
        throw new Error('Invalid UTF-8 sequence in decoded cursor')
      }

      return decoded
    },
    catch: cause => cursorError(`Failed to decode cursor: ${cursor}`, cause),
  })
}

/**
 * Encodes a composite cursor for (device_uuid, time) as JSON string then base64
 */
export function encodeCompositeCursor(
  deviceUuid: string,
  time: Date,
): Effect.Effect<string, never, never> {
  return Effect.succeed(
    Buffer.from(JSON.stringify({ deviceUuid, time: time.toISOString() })).toString('base64'),
  )
}

/**
 * Decodes a composite cursor to extract (device_uuid, time)
 */
export function decodeCompositeCursor(
  cursor: string,
): Effect.Effect<{ deviceUuid: string; time: Date }, CursorError, never> {
  return Effect.try({
    try: () => {
      // Validate base64 format first
      if (!/^[A-Z0-9+/]*={0,2}$/i.test(cursor)) {
        throw new Error('Invalid base64 format')
      }

      const decoded = Buffer.from(cursor, 'base64').toString('utf8')
      const parsed = JSON.parse(decoded) as { deviceUuid: string; time: string }

      if (!parsed.deviceUuid || !parsed.time) {
        throw new Error('Invalid cursor structure: missing deviceUuid or time')
      }

      return {
        deviceUuid: parsed.deviceUuid,
        time: new Date(parsed.time),
      }
    },
    catch: cause => cursorError(`Failed to decode composite cursor: ${cursor}`, cause),
  })
}

/**
 * Safely decodes a cursor, returning a fallback value if invalid
 */
export function decodeCursorWithFallback(
  cursor: string | undefined,
  fallback: string,
): Effect.Effect<string, never, never> {
  return decodeCursor(cursor).pipe(
    Effect.catchAll(() => Effect.succeed(fallback)),
  )
}
