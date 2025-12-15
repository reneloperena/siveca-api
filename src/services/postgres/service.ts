import type { Effect } from 'effect'
import type { DatabaseError, NotFoundError } from '../../errors'
import { Context } from 'effect'

/**
 * Telemetry query parameters (Relay-style pagination)
 */
export type TelemetryQueryParams = {
  deviceUuid?: string
  startTime: Date
  endTime: Date
  limit: number
  // Forward pagination
  afterCursor?: string // UUID cursor
  // Backward pagination
  beforeCursor?: string // UUID cursor
  isBackward?: boolean
}

/**
 * Telemetry point from database
 */
export type TelemetryPoint = {
  cursorId: string // UUID for cursor-based pagination
  time: Date
  deviceUuid: string
  fwVer: string | null
  model: string | null
  ingestedAt: Date
  temp: number | null
  hum: number | null
  pres: number | null
  pm1: number | null
  pm25: number | null
  pm10: number | null
  no: number | null
  no2: number | null
  o3: number | null
  so2: number | null
  co: number | null
  h2s: number | null
  nh3: number | null
  co2: number | null
  voc: number | null
  noise: number | null
  solarRad: number | null
  rainRate: number | null
  windDir: number | null
  windSpd: number | null
  lux: number | null
  extras: Record<string, unknown>
}

/**
 * New telemetry point for insertion
 */
export type NewTelemetryPoint = {
  time: Date
  deviceUuid: string
  fwVer: string | null
  model: string | null
  ingestedAt: Date
  temp: number | null
  hum: number | null
  pres: number | null
  pm1: number | null
  pm25: number | null
  pm10: number | null
  no: number | null
  no2: number | null
  o3: number | null
  so2: number | null
  co: number | null
  h2s: number | null
  nh3: number | null
  co2: number | null
  voc: number | null
  noise: number | null
  solarRad: number | null
  rainRate: number | null
  windDir: number | null
  windSpd: number | null
  lux: number | null
  extras: Record<string, unknown>
}

/**
 * Station from database
 */
export type Station = {
  uuid: string
  name: string | null
  model: string | null
  fwVer: string | null
  location: { latitude: number; longitude: number } | null
  description: string | null
  status: string
  autoCreated: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * New station for insertion
 */
export type NewStation = {
  uuid: string
  name: string | null
  model: string | null
  fwVer: string | null
  location: { latitude: number; longitude: number } | null
  description: string | null
  status: string
  autoCreated: boolean
}

/**
 * Station update fields
 */
export type UpdateStation = {
  name?: string | null
  model?: string | null
  fwVer?: string | null
  location?: { latitude: number; longitude: number } | null
  description?: string | null
  status?: string
}

/**
 * Station list query parameters
 */
export type StationListParams = {
  status?: string
}

/**
 * Clean PostgresService interface that abstracts away Kysely details
 * This makes it easy to mock and test without exposing database internals
 */
export type PostgresService = {
  // Health
  readonly health: () => Effect.Effect<void, DatabaseError, never>
  // Telemetry queries
  readonly queryTelemetry: (
    params: TelemetryQueryParams,
  ) => Effect.Effect<TelemetryPoint[], DatabaseError, never>
  // Telemetry insertion
  readonly insertTelemetry: (
    point: NewTelemetryPoint,
  ) => Effect.Effect<void, DatabaseError, never>
  // Station queries
  readonly findStationByUuid: (
    uuid: string,
    includeDeleted?: boolean,
  ) => Effect.Effect<Station | null, DatabaseError, never>
  readonly listStations: (
    params: StationListParams,
  ) => Effect.Effect<Station[], DatabaseError, never>
  readonly createStation: (
    station: NewStation,
  ) => Effect.Effect<Station, DatabaseError, never>
  readonly updateStation: (
    uuid: string,
    updates: UpdateStation,
  ) => Effect.Effect<Station, DatabaseError | NotFoundError, never>
  readonly softDeleteStation: (
    uuid: string,
  ) => Effect.Effect<void, DatabaseError | NotFoundError, never>
  // Internal: Upsert station for auto-creation (used by telemetry ingestion)
  readonly upsertStationForTelemetry: (
    station: NewStation,
  ) => Effect.Effect<Station, DatabaseError, never>
}

/**
 * Context tag for PostgresService dependency injection
 */
export const PostgresServiceTag = Context.GenericTag<PostgresService>('PostgresService')
