import type { FastifyInstance } from 'fastify'
import { Layer } from 'effect'
import * as telemetryService from '../../../business-logic/telemetry'
import { AuthLive, PostgresLive } from '../../../services'
import { createEndpointHandler } from '../handler'
import {
  TelemetryQueryRequestSchema,
  TelemetryPaginationResultSchema,
  type TelemetryQueryRequest,
} from '../../types/telemetry'

const telemetryHandler = createEndpointHandler(Layer.mergeAll(PostgresLive, AuthLive))

const queryTelemetry = telemetryHandler(telemetryService.queryTelemetry, {
  statusCode: 200,
  paramExtractor: (req) => {
    const query = req.query as any
    return [
      {
        deviceUuid: query.device_uuid,
        startTime: query.start_time,
        endTime: query.end_time,
        limit: query.limit ? Number(query.limit) : undefined,
        after: query.after,
      },
    ]
  },
})

export async function registerTelemetryRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: TelemetryQueryRequest }>(
    '/telemetry',
    {
      schema: {
        tags: ['Telemetry'],
        querystring: TelemetryQueryRequestSchema,
        response: {
          200: TelemetryPaginationResultSchema,
          400: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'number' },
                  message: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'number' },
                  message: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    queryTelemetry,
  )
}
