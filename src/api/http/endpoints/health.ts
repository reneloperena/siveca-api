import type { FastifyInstance } from 'fastify'
import { Layer } from 'effect'
import * as healthService from '../../../business-logic/health'
import { AuthLive, PostgresLive, VerneMQLive } from '../../../services'
import { createEndpointHandler } from '../handler'

const livenessHandler = createEndpointHandler(Layer.empty)
const readinessHandler = createEndpointHandler(Layer.mergeAll(PostgresLive, AuthLive, VerneMQLive))
const healthHandler = createEndpointHandler(Layer.mergeAll(PostgresLive, AuthLive, VerneMQLive))

export async function registerHealthRoutes(fastify: FastifyInstance) {
  fastify.get('/live', {
    schema: {
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
      },
    },
  }, livenessHandler(healthService.liveness, {
    statusCode: 200,
    unauthenticated: true,
  }))

  fastify.get('/ready', {
    schema: {
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
      },
    },
  }, readinessHandler(healthService.readiness, {
    statusCode: 200,
    unauthenticated: true,
  }))

  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            service: { type: 'string' },
            version: { type: 'string' },
            status: { type: 'string' },
            uptimeSec: { type: 'number' },
            dependencies: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  latencyMs: { type: 'number' },
                  checkedAt: { type: 'string' },
                  error: { type: 'string' },
                  details: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  }, healthHandler(healthService.health, {
    statusCode: 200,
    unauthenticated: true,
  }))
}
