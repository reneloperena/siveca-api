import type { DatabaseService } from './db'
import { Effect, Layer } from 'effect'
import { PostgresServiceTag } from '../service'
import { DatabaseServiceLive, DatabaseServiceTag, healthPostgres } from './db'
import { queryTelemetry } from './telemetry'
import { insertTelemetry } from './telemetry-insert'
import {
  findStationByUuid,
  listStations,
  createStation,
  updateStation,
  softDeleteStation,
  upsertStationForTelemetry,
} from './stations'

/**
 * Live implementation of PostgresService using Kysely internally
 * This keeps Kysely details inside the postgres layer
 */
const makePostgresService = Effect.gen(function* () {
  const databaseService = yield* DatabaseServiceTag

  const withDatabase = <A, E>(effect: Effect.Effect<A, E, DatabaseService>) =>
    Effect.provide(effect, Layer.succeed(DatabaseServiceTag, databaseService))

  return PostgresServiceTag.of({
    // Health
    health: () => withDatabase(healthPostgres()),
    // Telemetry queries
    queryTelemetry: (params) => withDatabase(queryTelemetry(params)),
    // Telemetry insertion
    insertTelemetry: (point) => withDatabase(insertTelemetry(point)),
    // Station queries
    findStationByUuid: (uuid, includeDeleted) => withDatabase(findStationByUuid(uuid, includeDeleted)),
    listStations: (params) => withDatabase(listStations(params)),
    createStation: (station) => withDatabase(createStation(station)),
    updateStation: (uuid, updates) => withDatabase(updateStation(uuid, updates)),
    softDeleteStation: (uuid) => withDatabase(softDeleteStation(uuid)),
    upsertStationForTelemetry: (station) => withDatabase(upsertStationForTelemetry(station)),
  })
})

/**
 * Live layer that provides PostgresService
 * Depends on DatabaseService (which provides Kysely internally)
 */
export const PostgresLive = Layer.effect(
  PostgresServiceTag,
  makePostgresService,
).pipe(Layer.provide(DatabaseServiceLive))
