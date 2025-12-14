import type { Station, NewStation, UpdateStation } from '../../services/postgres/service'
import { Effect } from 'effect'

/**
 * API representation of a station
 */
export type StationApi = {
  uuid: string
  name: string | null
  model: string | null
  fwVer: string | null
  location: { latitude: number; longitude: number } | null
  description: string | null
  status: string
  autoCreated: boolean
  deletedAt: string | null // ISO 8601 timestamp
  createdAt: string // ISO 8601 timestamp
  updatedAt: string // ISO 8601 timestamp
}

/**
 * Create station request
 */
export type CreateStationRequest = {
  uuid: string
  name?: string | null
  model?: string | null
  fwVer?: string | null
  location?: { latitude: number; longitude: number } | null
  description?: string | null
  status?: string
  autoCreated?: boolean
}

/**
 * Update station request
 */
export type UpdateStationRequest = {
  name?: string | null
  model?: string | null
  fwVer?: string | null
  location?: { latitude: number; longitude: number } | null
  description?: string | null
  status?: string
}

/**
 * Transforms database station to API format
 */
export function toApi(station: Station): Effect.Effect<StationApi, never, never> {
  return Effect.succeed({
    uuid: station.uuid,
    name: station.name,
    model: station.model,
    fwVer: station.fwVer,
    location: station.location,
    description: station.description,
    status: station.status,
    autoCreated: station.autoCreated,
    deletedAt: station.deletedAt ? station.deletedAt.toISOString() : null,
    createdAt: station.createdAt.toISOString(),
    updatedAt: station.updatedAt.toISOString(),
  })
}

/**
 * Transforms API create request to database format
 */
export function toDbNew(
  input: CreateStationRequest,
): Effect.Effect<NewStation, never, never> {
  return Effect.succeed({
    uuid: input.uuid,
    name: input.name ?? null,
    model: input.model ?? null,
    fwVer: input.fwVer ?? null,
    location: input.location ?? null,
    description: input.description ?? null,
    status: input.status ?? 'pending',
    autoCreated: input.autoCreated ?? false,
  })
}

/**
 * Transforms API update request to database format
 */
export function toDbUpdate(
  input: UpdateStationRequest,
): Effect.Effect<UpdateStation, never, never> {
  const update: UpdateStation = {}
  if (input.name !== undefined) {
    update.name = input.name
  }
  if (input.model !== undefined) {
    update.model = input.model
  }
  if (input.fwVer !== undefined) {
    update.fwVer = input.fwVer
  }
  if (input.location !== undefined) {
    update.location = input.location
  }
  if (input.description !== undefined) {
    update.description = input.description
  }
  if (input.status !== undefined) {
    update.status = input.status
  }
  return Effect.succeed(update)
}
