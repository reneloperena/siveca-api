import type { FastifyInstance } from 'fastify'
import { Layer } from 'effect'
import * as stationService from '../../../business-logic/stations'
import { AuthLive, PostgresLive } from '../../../services'
import { createEndpointHandler } from '../handler'
import {
  StationSchema,
  CreateStationRequestSchema,
  UpdateStationRequestSchema,
  StationListParamsSchema,
  type CreateStationRequest,
  type UpdateStationRequest,
} from '../../types/stations'

const stationHandler = createEndpointHandler(Layer.mergeAll(PostgresLive, AuthLive))

const listStations = stationHandler(stationService.listStations, {
  statusCode: 200,
  paramExtractor: (req) => {
    const query = req.query as any
    return [{ status: query.status }]
  },
})

const getStationById = stationHandler(stationService.getStationById, {
  statusCode: 200,
  paramExtractor: (req) => {
    const params = req.params as any
    return [params.uuid]
  },
})

const createStation = stationHandler(stationService.createStation, {
  statusCode: 201,
  paramExtractor: (req) => {
    return [req.body as CreateStationRequest]
  },
})

const updateStation = stationHandler(stationService.updateStation, {
  statusCode: 200,
  paramExtractor: (req) => {
    const params = req.params as any
    return [params.uuid, req.body as UpdateStationRequest]
  },
})

const deleteStation = stationHandler(stationService.deleteStation, {
  statusCode: 204,
  paramExtractor: (req) => {
    const params = req.params as any
    return [params.uuid]
  },
})

export async function registerStationRoutes(fastify: FastifyInstance) {
  // List stations
  fastify.get<{ Querystring: { status?: string } }>('/stations', {
    schema: {
      tags: ['Stations'],
      querystring: StationListParamsSchema,
      response: {
        200: Type.Array(StationSchema),
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
  }, listStations)

  // Get station by UUID
  fastify.get<{ Params: { uuid: string } }>('/stations/:uuid', {
    schema: {
      tags: ['Stations'],
      params: Type.Object({
        uuid: Type.String(),
      }),
      response: {
        200: StationSchema,
        404: {
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
  }, getStationById)

  // Create station
  fastify.post<{ Body: CreateStationRequest }>('/stations', {
    schema: {
      tags: ['Stations'],
      body: CreateStationRequestSchema,
      response: {
        201: StationSchema,
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
  }, createStation)

  // Update station
  fastify.patch<{ Params: { uuid: string }; Body: UpdateStationRequest }>('/stations/:uuid', {
    schema: {
      tags: ['Stations'],
      params: Type.Object({
        uuid: Type.String(),
      }),
      body: UpdateStationRequestSchema,
      response: {
        200: StationSchema,
        404: {
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
  }, updateStation)

  // Delete station (soft delete)
  fastify.delete<{ Params: { uuid: string } }>('/stations/:uuid', {
    schema: {
      tags: ['Stations'],
      params: Type.Object({
        uuid: Type.String(),
      }),
      response: {
        204: Type.Null(),
        404: {
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
  }, deleteStation)
}
