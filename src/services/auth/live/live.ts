import { Effect, Layer } from 'effect'
import { AuthServiceTag } from '../service'

function healthAuth(): Effect.Effect<void, never> {
  // Auth service health check - always succeeds for now
  return Effect.succeed(undefined)
}

/**
 * Live implementation of AuthService
 */
const makeAuthService = Effect.gen(function* () {
  return AuthServiceTag.of({
    health: () => healthAuth(),
  })
})

/**
 * Live layer that provides AuthService
 */
export const AuthLive = Layer.effect(
  AuthServiceTag,
  makeAuthService,
)
