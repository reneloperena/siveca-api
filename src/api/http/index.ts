import type { FastifyInstance } from 'fastify'
import { registerHealthRoutes } from './endpoints/health'
import { registerTelemetryRoutes } from './endpoints/telemetry'
import { registerStationRoutes } from './endpoints/stations'

export async function registerHttpRoutes(fastify: FastifyInstance) {
  await fastify.register(registerHealthRoutes, { prefix: '/v1' })
  await fastify.register(registerTelemetryRoutes, { prefix: '/v1' })
  await fastify.register(registerStationRoutes, { prefix: '/v1' })
}
