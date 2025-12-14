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

    return yield* Effect.tryPromise({
      try: async () => {
        // First check if station exists and is not deleted
        const existing = await db
          .selectFrom('stations' as any)
          .select(['uuid'])
          .where('uuid', '=', uuid)
          .where('deleted_at' as any, 'is', null)
          .executeTakeFirst()

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

        const row = await db
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

        return mapRowToStation(row as any)
      },
      catch: cause => {
        if ((cause as any)?._tag === 'NotFoundError') {
          return yield* Effect.fail(cause)
        }
        return yield* Effect.fail(databaseError('update_station', cause))
      },
    })
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

    return yield* Effect.tryPromise({
      try: async () => {
        // First check if station exists and is not already deleted
        const existing = await db
          .selectFrom('stations' as any)
          .select(['uuid'])
          .where('uuid', '=', uuid)
          .where('deleted_at' as any, 'is', null)
          .executeTakeFirst()

        if (!existing) {
          return yield* Effect.fail(notFound('Station', uuid))
        }

        await db
          .updateTable('stations' as any)
          .set({
            deleted_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .where('uuid', '=', uuid)
          .execute()

        return undefined
      },
      catch: cause => {
        if ((cause as any)?._tag === 'NotFoundError') {
          return yield* Effect.fail(cause)
        }
        return yield* Effect.fail(databaseError('soft_delete_station', cause))
      },
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
        const locationSql = station.location
          ? sql`ST_SetSRID(ST_MakePoint(${station.location.longitude}, ${station.location.latitude}), 4326)::geography`
          : null

        // Use INSERT ... ON CONFLICT to handle both creation and re-activation
        const result = await sql`
          INSERT INTO stations (uuid, name, model, fw_ver, location, description, status, auto_created, deleted_at, created_at, updated_at)
          VALUES (
            ${station.uuid},
            ${station.name},
            ${station.model},
            ${station.fwVer},
            ${locationSql},
            ${station.description},
            ${station.status},
            ${station.autoCreated},
            NULL,
            COALESCE((SELECT created_at FROM stations WHERE uuid = ${station.uuid}), now()),
            now()
          )
          ON CONFLICT (uuid) DO UPDATE SET
            deleted_at = NULL,
            model = COALESCE(EXCLUDED.model, stations.model),
            fw_ver = COALESCE(EXCLUDED.fw_ver, stations.fw_ver),
            updated_at = now()
          RETURNING 
            uuid,
            name,
            model,
            fw_ver,
            ST_Y(location::geometry) as latitude,
            ST_X(location::geometry) as longitude,
            description,
            status,
            auto_created,
            deleted_at,
            created_at,
            updated_at
        `.execute(db)

        const row = result.rows[0] as any
        if (!row) {
          throw new Error('Upsert station returned no rows')
        }
        return mapRowToStation(row)
      },
      catch: cause => databaseError('upsert_station', cause),
    })
  })
}

/**
 * Map database row to Station type
 */
function mapRowToStation(row: any): Station {
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

  return {
    uuid: row.uuid,
    name: row.name ?? null,
    model: row.model ?? null,
    fwVer: row.fw_ver ?? null,
    location,
    description: row.description ?? null,
    status: row.status,
    autoCreated: row.auto_created ?? true,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}
