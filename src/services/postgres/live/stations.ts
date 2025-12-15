import type { DatabaseService } from './db'
import type { Station, NewStation, UpdateStation, StationListParams } from '../service'
import { Effect } from 'effect'
import { sql } from 'kysely'
import { DatabaseServiceTag } from './db'
import { databaseError, notFound } from '../../../errors'

/**
 * Find station by UUID
 */
export function findStationByUuid(
  uuid: string,
  includeDeleted = false,
): Effect.Effect<Station | null, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        let query = db
          .selectFrom('stations' as any)
          .select([
            'uuid',
            'name',
            'model',
            'fw_ver',
            sql<number | null>`ST_Y(location::geometry)`.as('latitude'),
            sql<number | null>`ST_X(location::geometry)`.as('longitude'),
            'description',
            'status',
            'auto_created',
            'deleted_at',
            'created_at',
            'updated_at',
          ])
          .where('uuid', '=', uuid)

        if (!includeDeleted) {
          query = query.where('deleted_at' as any, 'is', null)
        }

        const row = await query.executeTakeFirst()

        if (!row) {
          return null
        }

        return mapRowToStation(row as any)
      },
      catch: cause => databaseError('find_station_by_uuid', cause),
    })
  })
}

/**
 * List stations with optional status filter
 */
export function listStations(
  params: StationListParams,
): Effect.Effect<Station[], any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        let query = db
          .selectFrom('stations' as any)
          .select([
            'uuid',
            'name',
            'model',
            'fw_ver',
            sql<number | null>`ST_Y(location::geometry)`.as('latitude'),
            sql<number | null>`ST_X(location::geometry)`.as('longitude'),
            'description',
            'status',
            'auto_created',
            'deleted_at',
            'created_at',
            'updated_at',
          ])
          .where('deleted_at' as any, 'is', null) // Only non-deleted stations

        if (params.status) {
          query = query.where('status' as any, '=', params.status)
        }

        query = query.orderBy('created_at' as any, 'asc')

        const rows = await query.execute()

        return rows.map((row: any) => mapRowToStation(row))
      },
      catch: cause => databaseError('list_stations', cause),
    })
  })
}

/**
 * Create a new station
 */
export function createStation(
  station: NewStation,
): Effect.Effect<Station, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const locationSql = station.location
          ? sql`ST_SetSRID(ST_MakePoint(${station.location.longitude}, ${station.location.latitude}), 4326)::geography`
          : null

        const row = await db
          .insertInto('stations' as any)
          .values({
            uuid: station.uuid,
            name: station.name,
            model: station.model,
            fw_ver: station.fwVer,
            location: locationSql as any,
            description: station.description,
            status: station.status,
            auto_created: station.autoCreated,
            deleted_at: null,
          })
          .returning([
            'uuid',
            'name',
            'model',
            'fw_ver',
            sql<number | null>`ST_Y(location::geometry)`.as('latitude'),
            sql<number | null>`ST_X(location::geometry)`.as('longitude'),
            'description',
            'status',
            'auto_created',
            'deleted_at',
            'created_at',
            'updated_at',
          ])
          .executeTakeFirstOrThrow()

        return mapRowToStation(row as any)
      },
      catch: cause => databaseError('create_station', cause),
    })
  })
}

/**
 * Update station (only non-deleted stations)
 */
export function updateStation(
  uuid: string,
  updates: UpdateStation,
): Effect.Effect<Station, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    // First check if station exists and is not deleted
    const existing = yield* Effect.tryPromise({
      try: async () => {
        return await db
          .selectFrom('stations' as any)
          .select(['uuid'])
          .where('uuid', '=', uuid)
          .where('deleted_at' as any, 'is', null)
          .executeTakeFirst()
      },
      catch: cause => databaseError('check_station_exists', cause),
    })

    if (!existing) {
      return yield* Effect.fail(notFound('Station', uuid))
    }

    // Build update object
    const updateValues: any = {
      updated_at: sql`now()`,
    }

    if (updates.name !== undefined) {
      updateValues.name = updates.name
    }
    if (updates.model !== undefined) {
      updateValues.model = updates.model
    }
    if (updates.fwVer !== undefined) {
      updateValues.fw_ver = updates.fwVer
    }
    if (updates.description !== undefined) {
      updateValues.description = updates.description
    }
    if (updates.status !== undefined) {
      updateValues.status = updates.status
    }
    if (updates.location !== undefined) {
      updateValues.location = updates.location
        ? sql`ST_SetSRID(ST_MakePoint(${updates.location.longitude}, ${updates.location.latitude}), 4326)::geography`
        : null
    }

    const row = yield* Effect.tryPromise({
      try: async () => {
        return await db
          .updateTable('stations' as any)
          .set(updateValues)
          .where('uuid', '=', uuid)
          .where('deleted_at' as any, 'is', null)
          .returning([
            'uuid',
            'name',
            'model',
            'fw_ver',
            sql<number | null>`ST_Y(location::geometry)`.as('latitude'),
            sql<number | null>`ST_X(location::geometry)`.as('longitude'),
            'description',
            'status',
            'auto_created',
            'deleted_at',
            'created_at',
            'updated_at',
          ])
          .executeTakeFirstOrThrow()
      },
      catch: cause => databaseError('update_station', cause),
    })

    return mapRowToStation(row as any)
  })
}

/**
 * Soft delete station (sets deleted_at timestamp)
 */
export function softDeleteStation(
  uuid: string,
): Effect.Effect<void, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    // First check if station exists and is not already deleted
    const existing = yield* Effect.tryPromise({
      try: async () => {
        return await db
          .selectFrom('stations' as any)
          .select(['uuid'])
          .where('uuid', '=', uuid)
          .where('deleted_at' as any, 'is', null)
          .executeTakeFirst()
      },
      catch: cause => databaseError('check_station_exists', cause),
    })

    if (!existing) {
      return yield* Effect.fail(notFound('Station', uuid))
    }

    yield* Effect.tryPromise({
      try: async () => {
        await db
          .updateTable('stations' as any)
          .set({
            deleted_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .where('uuid', '=', uuid)
          .execute()
      },
      catch: cause => databaseError('soft_delete_station', cause),
    })
  })
}

/**
 * Upsert station (for auto-creation with re-activation support)
 * If station exists but is soft-deleted, re-activate it
 * This is used internally for auto-creation during telemetry ingestion
 */
export function upsertStationForTelemetry(
  station: NewStation,
): Effect.Effect<Station, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        // First, try a simple query to see if table exists
        try {
          await db.selectFrom('stations' as any).select(['uuid']).limit(1).execute()
        } catch (tableError: any) {
          const errorMsg = tableError?.message || String(tableError)
          if (errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
            throw new Error(`Stations table does not exist. Please run migrations: ${errorMsg}`)
          }
          throw tableError
        }

        // Check if station exists first
        const existing = await db
          .selectFrom('stations' as any)
          .select(['uuid', 'created_at'])
          .where('uuid', '=', station.uuid)
          .executeTakeFirst()

        if (existing) {
          // Update existing station (re-activate if soft-deleted)
          const locationSql = station.location
            ? sql`ST_SetSRID(ST_MakePoint(${station.location.longitude}, ${station.location.latitude}), 4326)::geography`
            : null

          const updateValues: any = {
            deleted_at: null,
            updated_at: sql`now()`,
          }

          if (station.model) {
            updateValues.model = station.model
          }
          if (station.fwVer) {
            updateValues.fw_ver = station.fwVer
          }
          if (station.location) {
            updateValues.location = locationSql
          }

          const row = await db
            .updateTable('stations' as any)
            .set(updateValues)
            .where('uuid', '=', station.uuid)
            .returning([
              'uuid',
              'name',
              'model',
              'fw_ver',
              sql<number | null>`ST_Y(location::geometry)`.as('latitude'),
              sql<number | null>`ST_X(location::geometry)`.as('longitude'),
              'description',
              'status',
              'auto_created',
              'deleted_at',
              'created_at',
              'updated_at',
            ])
            .executeTakeFirstOrThrow()

          try {
            return mapRowToStation(row as any)
          } catch (mapError) {
            console.error('Error mapping row to station (update):', mapError)
            console.error('Row data:', JSON.stringify(row, null, 2))
            throw mapError
          }
        } else {
          // Insert new station
          const locationSql = station.location
            ? sql`ST_SetSRID(ST_MakePoint(${station.location.longitude}, ${station.location.latitude}), 4326)::geography`
            : null

          const row = await db
            .insertInto('stations' as any)
            .values({
              uuid: station.uuid,
              name: station.name,
              model: station.model,
              fw_ver: station.fwVer,
              location: locationSql as any,
              description: station.description,
              status: station.status,
              auto_created: station.autoCreated,
              deleted_at: null,
            })
            .returning([
              'uuid',
              'name',
              'model',
              'fw_ver',
              sql<number | null>`ST_Y(location::geometry)`.as('latitude'),
              sql<number | null>`ST_X(location::geometry)`.as('longitude'),
              'description',
              'status',
              'auto_created',
              'deleted_at',
              'created_at',
              'updated_at',
            ])
            .executeTakeFirstOrThrow()

          try {
            return mapRowToStation(row as any)
          } catch (mapError) {
            console.error('Error mapping row to station (insert):', mapError)
            console.error('Row data:', JSON.stringify(row, null, 2))
            throw mapError
          }
        }
      },
      catch: cause => {
        // Extract error message in a way that will be serializable
        let errorMessage = 'Unknown error'
        let errorCode: string | undefined
        let errorDetail: string | undefined
        
        if (cause instanceof Error) {
          errorMessage = cause.message
          // Check if it's a PostgreSQL error
          const pgError = cause as any
          if (pgError.code) {
            errorCode = pgError.code
            errorDetail = pgError.detail || pgError.message
            errorMessage = `PostgreSQL ${pgError.code}: ${pgError.message}`
            if (pgError.detail) errorMessage += ` - ${pgError.detail}`
            if (pgError.hint) errorMessage += ` (Hint: ${pgError.hint})`
          }
        } else if (typeof cause === 'string') {
          errorMessage = cause
        } else {
          errorMessage = JSON.stringify(cause)
        }
        
        // Log to console with full details
        console.error('=== UPSERT STATION ERROR ===')
        console.error('Message:', errorMessage)
        console.error('Code:', errorCode)
        console.error('Detail:', errorDetail)
        console.error('Full error:', cause)
        console.error('Station data:', JSON.stringify(station, null, 2))
        console.error('===========================')
        
        // Create a new error with the message so it's serializable
        const serializableError = new Error(errorMessage)
        if (errorCode) (serializableError as any).code = errorCode
        if (errorDetail) (serializableError as any).detail = errorDetail
        
        return databaseError('upsert_station', serializableError)
      },
    })
  })
}

/**
 * Safely parse a date value from the database
 */
function parseDate(value: any): Date {
  if (value === null || value === undefined) {
    throw new Error(`Invalid date value: ${value}`)
  }
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new Error(`Invalid Date object: ${value}`)
    }
    return value
  }
  // Try to parse as string or number
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value} (type: ${typeof value})`)
  }
  return date
}

/**
 * Map database row to Station type
 */
function mapRowToStation(row: any): Station {
  try {
    // Extract location from PostGIS coordinates
    let location: { latitude: number; longitude: number } | null = null
    if (row.latitude !== null && row.longitude !== null && row.latitude !== undefined && row.longitude !== undefined) {
      location = {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      }
    } else if (row.location?.latitude !== undefined && row.location?.longitude !== undefined) {
      location = {
        latitude: Number(row.location.latitude),
        longitude: Number(row.location.longitude),
      }
    }

    // Parse dates with better error messages
    // Note: Kysely's CamelCasePlugin converts snake_case to camelCase
    let createdAt: Date
    let updatedAt: Date
    let deletedAt: Date | null = null

    // Try both camelCase (from Kysely) and snake_case (direct from DB)
    const created_at = row.createdAt ?? row.created_at
    const updated_at = row.updatedAt ?? row.updated_at
    const deleted_at = row.deletedAt ?? row.deleted_at

    try {
      createdAt = parseDate(created_at)
    } catch (e) {
      throw new Error(`Failed to parse created_at: ${created_at} - ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      updatedAt = parseDate(updated_at)
    } catch (e) {
      throw new Error(`Failed to parse updated_at: ${updated_at} - ${e instanceof Error ? e.message : String(e)}`)
    }

    if (deleted_at) {
      try {
        deletedAt = parseDate(deleted_at)
      } catch (e) {
        // Log but don't fail - deleted_at can be null anyway
        console.warn(`Failed to parse deleted_at: ${deleted_at} - ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return {
      uuid: row.uuid,
      name: row.name ?? null,
      model: row.model ?? null,
      fwVer: row.fwVer ?? row.fw_ver ?? null,
      location,
      description: row.description ?? null,
      status: row.status,
      autoCreated: row.autoCreated ?? row.auto_created ?? true,
      deletedAt,
      createdAt,
      updatedAt,
    }
  } catch (error) {
    console.error('Error in mapRowToStation:', error)
    console.error('Row data:', JSON.stringify(row, null, 2))
    throw error
  }
}
