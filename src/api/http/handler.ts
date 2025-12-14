import type { AuthContext } from '../shared/context'
import process from 'node:process'
import { Effect, Layer } from 'effect'
import { LoggerLive } from '../../logging'
import { buildHttpContext } from './context'
import { mapErrorToStandardResponse } from './error-mapper'

type HandlerOptions = {
  statusCode?: number
  paramExtractor?: (req: any) => any[]
  unauthenticated?: boolean
}

export function createEndpointHandler<R>(
  layers: Layer.Layer<R, any, any>,
) {
  // Authenticated handler (requires AuthContext)
  function handler<A>(
    serviceFunction: (ctx: AuthContext, ...args: any[]) => Effect.Effect<A, any, R>,
    options?: HandlerOptions,
  ): (req: any, reply: any) => Promise<void>

  // Unauthenticated handler (no AuthContext)
  function handler<A>(
    serviceFunction: (...args: any[]) => Effect.Effect<A, any, R>,
    options: HandlerOptions & { unauthenticated: true },
  ): (req: any, reply: any) => Promise<void>

  // Implementation
  function handler<A>(
    serviceFunction: ((ctx: AuthContext, ...args: any[]) => Effect.Effect<A, any, R>) | ((...args: any[]) => Effect.Effect<A, any, R>),
    options: HandlerOptions = {},
  ) {
    return async (req: any, reply: any): Promise<void> => {
      const {
        statusCode = 200,
        paramExtractor = (_: any) => [],
        unauthenticated = false,
      } = options

      const args = paramExtractor(req)

      const startTime = process.hrtime.bigint()

      try {
        const logContext = {
          method: req.method,
          url: req.url,
          requestId: req.id,
          routePath: req.routerPath,
          remoteAddress: req.ip,
        }

        const effect = Effect.gen(function* () {
          yield* Effect.logDebug('[HTTP] Request started', logContext)

          let result: A
          if (unauthenticated) {
            result = yield* (serviceFunction as (...args: any[]) => Effect.Effect<A, any, R>)(...args)
          }
          else {
            const ctx = yield* buildHttpContext(req)
            result = yield* (serviceFunction as (ctx: AuthContext, ...args: any[]) => Effect.Effect<A, any, R>)(ctx, ...args)
          }

          const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000
          yield* Effect.logInfo('[HTTP] Request completed', { ...logContext, statusCode, durationMs })

          return result
        }).pipe(
          Effect.tapError(error =>
            Effect.gen(function* () {
              const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000
              yield* Effect.logError('[HTTP] Request failed', { ...logContext, statusCode: reply.statusCode, durationMs }, error)
            }),
          ),
          Effect.provide(Layer.mergeAll(layers, LoggerLive)),
        ) as Effect.Effect<A, any, never>

        const result = await Effect.runPromise(effect)
        reply.code(statusCode)
        if (result !== undefined) {
          reply.send(result)
        }
      }
      catch (error: any) {
        const standardError = mapErrorToStandardResponse(error)
        reply.code(standardError.error.code).send(standardError)
      }
    }
  }

  return handler
}
