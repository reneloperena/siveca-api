import type { FastifyInstance } from 'fastify'
import { registerAsyncApiDocs } from './asyncapi'

export async function registerWebSocketRoutes(fastify: FastifyInstance) {
  // AsyncAPI documentation endpoint
  await registerAsyncApiDocs(fastify)
}
