import { Effect } from 'effect'
import { PostgresServiceTag } from '../services/postgres/service'
import { notFound } from '../errors'
import { toApi, toDbNew, toDbUpdate, type CreateStationRequest, type UpdateStationRequest } from './mappers/stations'
import type { StationListParams } from '../services/postgres/service'

/**
 * List stations with optional status filter
 */
export function listStations(
  params: StationListParams = {},
): Effect.Effect<
  Array<{
    uuid: string
    name: string | null
    model: string | null
    fwVer: string | null
    location: { latitude: number; longitude: number } | null
    description: string | null
    status: string
    autoCreated: boolean
    deletedAt: string | null
    createdAt: string
    updatedAt: string
  }>,
  any,
  any
> {
  return Effect.gen(function* () {
    const service = yield* PostgresServiceTag
    const stations = yield* service.listStations(params)

    // Transform to API format
    const apiStations = yield* Effect.all(stations.map(station => toApi(station)))

    return apiStations
  })
}

/**
 * Get station by UUID
 */
export function getStationById(
  uuid: string,
): Effect.Effect<
  {
    uuid: string
    name: string | null
    model: string | null
    fwVer: string | null
    location: { latitude: number; longitude: number } | null
    description: string | null
    status: string
    autoCreated: boolean
    deletedAt: string | null
    createdAt: string
    updatedAt: string
  },
  any,
  any
> {
  return Effect.gen(function* () {
    const service = yield* PostgresServiceTag
    const station = yield* service.findStationByUuid(uuid)

    if (!station) {
      return yield* Effect.fail(notFound('Station', uuid))
    }

    return yield* toApi(station)
  })
}

/**
 * Create a new station
 */
export function createStation(
  input: CreateStationRequest,
): Effect.Effect<
  {
    uuid: string
    name: string | null
    model: string | null
    fwVer: string | null
    location: { latitude: number; longitude: number } | null
    description: string | null
    status: string
    autoCreated: boolean
    deletedAt: string | null
    createdAt: string
    updatedAt: string
  },
  any,
  any
> {
  return Effect.gen(function* () {
    const service = yield* PostgresServiceTag
    const dbNew = yield* toDbNew(input)
    const station = yield* service.createStation(dbNew)
    return yield* toApi(station)
  })
}

/**
 * Update station
 */
export function updateStation(
  uuid: string,
  input: UpdateStationRequest,
): Effect.Effect<
  {
    uuid: string
    name: string | null
    model: string | null
    fwVer: string | null
    location: { latitude: number; longitude: number } | null
    description: string | null
    status: string
    autoCreated: boolean
    deletedAt: string | null
    createdAt: string
    updatedAt: string
  },
  any,
  any
> {
  return Effect.gen(function* () {
    const service = yield* PostgresServiceTag
    const dbUpdate = yield* toDbUpdate(input)
    const station = yield* service.updateStation(uuid, dbUpdate)
    return yield* toApi(station)
  })
}

/**
 * Delete station (soft delete)
 */
export function deleteStation(
  uuid: string,
): Effect.Effect<void, any, any> {
  return Effect.gen(function* () {
    const service = yield* PostgresServiceTag
    yield* service.softDeleteStation(uuid)
  })
}
