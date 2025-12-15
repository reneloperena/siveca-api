import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import process from 'node:process'
import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { Effect, Layer } from 'effect'
import Fastify from 'fastify'
import { registerHttpRoutes } from './api/http'
import { registerWebSocketRoutes } from './api/websocket'
import { startTelemetryListener } from './business-logic/telemetry-listener'
import config from './config'
import { LoggerLive } from './logging'
import { AuthLive } from './services/auth'
import { PostgresLive } from './services/postgres'
import { VerneMQLive } from './services/vernemq'
import 'dotenv/config'

async function buildServer() {
  const app = Fastify().withTypeProvider<TypeBoxTypeProvider>()

  await app.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  })

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Siveca API',
        description: 'API documentation',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api/v1',
          description: 'Current server (via nginx or direct)',
        },
        {
          url: `http://localhost:${config.PORT}/api/v1`,
          description: 'Direct API server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    refResolver: {
      buildLocalReference(json, baseUri, fragment, i) {
        return `${json.$id}` || `def-${i}`
      },
    },
  })

  await app.register(fastifySwaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      persistAuthorization: true,
    },
  })

  await app.register(registerHttpRoutes, { prefix: '/api' })
  await app.register(registerWebSocketRoutes, { prefix: '/api/ws' })

  return app
}

const main = Effect.gen(function* () {
  const app = yield* Effect.promise(() => buildServer())

  const port = config.PORT
  const host = config.HOST

  yield* Effect.promise(() => app.listen({ port, host }))

  yield* Effect.logInfo(`API listening on http://${host}:${port}`)
  yield* Effect.logInfo(`Swagger docs available at http://${host}:${port}/api/docs`)
  yield* Effect.logInfo(`AsyncAPI spec available at http://${host}:${port}/api/ws/asyncapi.json`)

  // Start telemetry ingestion listener
  yield* startTelemetryListener()

  const shutdown = Effect.gen(function* () {
    yield* Effect.logInfo('Shutting down...')
    yield* Effect.promise(() => app.close())
    yield* Effect.sync(() => process.exit(0))
  })

  yield* Effect.async<void>((resume) => {
    const handleShutdown = () => {
      Effect.runPromise(shutdown).then(() => resume(Effect.void))
    }

    process.on('SIGINT', handleShutdown)
    process.on('SIGTERM', handleShutdown)

    return Effect.sync(() => {
      process.removeListener('SIGINT', handleShutdown)
      process.removeListener('SIGTERM', handleShutdown)
    })
  })
})

const serviceLayer = Layer.mergeAll(PostgresLive, AuthLive, VerneMQLive, LoggerLive)

const provided = Effect.provide(main, serviceLayer) as Effect.Effect<void, never, never>

Effect.runPromise(
  provided.pipe(
    Effect.tapError(e => Effect.logError('Application error:', e)),
    Effect.catchAll(() => Effect.sync(() => process.exit(1))),
  ),
)
