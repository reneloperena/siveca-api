import type { Effect } from 'effect'
import { Context } from 'effect'

export type AuthService = {
  // Health
  health: () => Effect.Effect<void, never, never>
}

/**
 * Context tag for AuthService dependency injection
 */
export const AuthServiceTag = Context.GenericTag<AuthService>('AuthService')
