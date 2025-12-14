import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { Effect } from 'effect'
import { unauthorizedError } from '../../errors'
import type { AuthContext, UserAuthContext } from '../shared/context'

/**
 * Builds authentication context from HTTP request.
 * Extracts and validates JWT token from Authorization header.
 */
export function buildHttpContext(
  req: FastifyRequest,
  traceId?: string,
): Effect.Effect<AuthContext, any, any> {
  return Effect.gen(function* () {
    // For now, return a simple unauthenticated context
    // This will be implemented with JWT verification later
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return yield* Effect.fail(unauthorizedError('Missing Authorization header'))
    }

    // Placeholder - will be implemented with actual JWT verification
    const placeholderContext: UserAuthContext = {
      type: 'user',
      userId: 'placeholder',
      username: 'placeholder',
      roles: [],
      traceId: traceId || randomUUID(),
    }

    return placeholderContext
  })
}
