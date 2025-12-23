import type { DatabaseService } from './db'
import { Effect } from 'effect'
import { sql } from 'kysely'
import { DatabaseServiceTag } from './db'
import { databaseError } from '../../../errors'

/**
 * Export catalog entry
 */
export type ExportCatalogEntry = {
  catalogType: string
  deviceUuid: string
  bucketTs: Date
  format: string
  year: number
  month: number
  day: number
  hour: number | null
  path: string
  filename: string
  fromTs: Date
  toTs: Date
  rowCount: number
  sizeEstimate: number
  firstTime: Date | null
  lastTime: Date | null
  finalized: boolean
  createdAt: Date
  updatedAt: Date
  extras: Record<string, unknown>
}

/**
 * New export catalog entry for insertion/upsert
 */
export type NewExportCatalogEntry = {
  catalogType: string
  deviceUuid: string
  bucketTs: Date
  format: string
  year: number
  month: number
  day: number
  hour: number | null
  path: string
  filename: string
  fromTs: Date
  toTs: Date
  rowCount: number
  sizeEstimate: number
  firstTime: Date | null
  lastTime: Date | null
  finalized: boolean
  extras?: Record<string, unknown>
}

/**
 * Path components for browsing
 */
export type CatalogBrowseParams = {
  catalogType: string
  year?: number
  month?: number
  day?: number
  hour?: number
}

/**
 * Idempotent upsert for catalog entries
 */
export function upsertExportCatalogEntry(
  entry: NewExportCatalogEntry,
): Effect.Effect<ExportCatalogEntry, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const now = new Date()
        const row = await db
          .insertInto('export_catalog' as any)
          .values({
            catalog_type: entry.catalogType,
            device_uuid: entry.deviceUuid,
            bucket_ts: entry.bucketTs,
            format: entry.format,
            year: entry.year,
            month: entry.month,
            day: entry.day,
            hour: entry.hour,
            path: entry.path,
            filename: entry.filename,
            from_ts: entry.fromTs,
            to_ts: entry.toTs,
            row_count: (() => {
              const val = Number(entry.rowCount)
              return isNaN(val) || !isFinite(val) ? 0 : val
            })(),
            size_estimate: (() => {
              const val = Number(entry.sizeEstimate)
              return isNaN(val) || !isFinite(val) ? 0 : val
            })(),
            first_time: entry.firstTime,
            last_time: entry.lastTime,
            finalized: entry.finalized,
            extras: entry.extras || {},
            updated_at: now,
          })
          .onConflict((oc) =>
            oc
              .columns(['catalog_type', 'device_uuid', 'bucket_ts', 'format'])
              .doUpdateSet({
                row_count: sql`excluded.row_count`,
                size_estimate: sql`excluded.size_estimate`,
                first_time: sql`excluded.first_time`,
                last_time: sql`excluded.last_time`,
                finalized: sql`excluded.finalized`,
                updated_at: now,
              }),
          )
          .returningAll()
          .executeTakeFirstOrThrow()

        return mapRowToEntry(row as any)
      },
      catch: cause => databaseError('upsert_export_catalog_entry', cause),
    })
  })
}

/**
 * Find catalog entry by primary key
 */
export function findCatalogEntry(
  catalogType: string,
  deviceUuid: string,
  bucketTs: Date,
  format: string,
): Effect.Effect<ExportCatalogEntry | null, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const row = await db
          .selectFrom('export_catalog' as any)
          .selectAll()
          .where('catalog_type', '=', catalogType)
          .where('device_uuid', '=', deviceUuid)
          .where('bucket_ts', '=', bucketTs)
          .where('format', '=', format)
          .executeTakeFirst()

        if (!row) {
          return null
        }

        return mapRowToEntry(row as any)
      },
      catch: cause => databaseError('find_catalog_entry', cause),
    })
  })
}

/**
 * List catalog entries for browsing by path components
 */
export function listCatalogEntries(
  params: CatalogBrowseParams,
): Effect.Effect<ExportCatalogEntry[], any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        let query = db
          .selectFrom('export_catalog' as any)
          .selectAll()
          .where('catalog_type', '=', params.catalogType)

        if (params.year !== undefined) {
          query = query.where('year', '=', params.year)
        }
        if (params.month !== undefined) {
          query = query.where('month', '=', params.month)
        }
        if (params.day !== undefined) {
          query = query.where('day', '=', params.day)
        }
        if (params.hour !== undefined) {
          query = query.where('hour', '=', params.hour)
        }

        query = query.orderBy('year', 'asc')
          .orderBy('month', 'asc')
          .orderBy('day', 'asc')
          .orderBy('hour', 'asc')
          .orderBy('device_uuid', 'asc')

        const rows = await query.execute()

        return rows.map((row: any) => mapRowToEntry(row))
      },
      catch: cause => databaseError('list_catalog_entries', cause),
    })
  })
}

/**
 * Get catalog entry by WebDAV path
 */
export function getCatalogEntryByPath(
  catalogType: string,
  path: string,
  filename: string,
): Effect.Effect<ExportCatalogEntry | null, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const row = await db
          .selectFrom('export_catalog' as any)
          .selectAll()
          .where('catalog_type', '=', catalogType)
          .where('path', '=', path)
          .where('filename', '=', filename)
          .executeTakeFirst()

        if (!row) {
          return null
        }

        return mapRowToEntry(row as any)
      },
      catch: cause => databaseError('get_catalog_entry_by_path', cause),
    })
  })
}

/**
 * Get all active device UUIDs from stations table
 */
export function getDeviceUuids(): Effect.Effect<string[], any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const rows = await db
          .selectFrom('stations' as any)
          .select(['uuid'])
          .where('deleted_at' as any, 'is', null)
          .execute()

        return rows.map((row: any) => row.uuid)
      },
      catch: cause => databaseError('get_device_uuids', cause),
    })
  })
}

/**
 * Get the most recent bucket_ts for a device and catalog_type (for backtracking)
 */
export function getLastProcessedHour(
  catalogType: string,
  deviceUuid: string,
): Effect.Effect<Date | null, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const row = await db
          .selectFrom('export_catalog' as any)
          .select(['bucket_ts'])
          .where('catalog_type', '=', catalogType)
          .where('device_uuid', '=', deviceUuid)
          .orderBy('bucket_ts', 'desc')
          .limit(1)
          .executeTakeFirst()

        if (!row) {
          return null
        }

        return row.bucket_ts as Date
      },
      catch: cause => databaseError('get_last_processed_hour', cause),
    })
  })
}

/**
 * Get the most recent telemetry_raw timestamp for a device
 * Returns the hour (rounded down) of the most recent record, or null if no data exists
 */
export function getMostRecentTelemetryHour(
  deviceUuid: string,
): Effect.Effect<Date | null, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const row = await db
          .selectFrom('telemetry_raw' as any)
          .select(['time'])
          .where('device_uuid', '=', deviceUuid)
          .orderBy('time', 'desc')
          .limit(1)
          .executeTakeFirst()

        if (!row) {
          return null
        }

        // Round down to hour start
        const time = row.time as Date
        const hourStart = new Date(time)
        hourStart.setUTCMinutes(0)
        hourStart.setUTCSeconds(0)
        hourStart.setUTCMilliseconds(0)

        return hourStart
      },
      catch: cause => databaseError('get_most_recent_telemetry_hour', cause),
    })
  })
}

/**
 * Get the earliest telemetry_raw timestamp for a device
 * Returns the hour (rounded down) of the earliest record, or null if no data exists
 */
export function getEarliestTelemetryHour(
  deviceUuid: string,
): Effect.Effect<Date | null, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const row = await db
          .selectFrom('telemetry_raw' as any)
          .select(['time'])
          .where('device_uuid', '=', deviceUuid)
          .orderBy('time', 'asc')
          .limit(1)
          .executeTakeFirst()

        if (!row) {
          return null
        }

        // Round down to hour start
        const time = row.time as Date
        const hourStart = new Date(time)
        hourStart.setUTCMinutes(0)
        hourStart.setUTCSeconds(0)
        hourStart.setUTCMilliseconds(0)

        return hourStart
      },
      catch: cause => databaseError('get_earliest_telemetry_hour', cause),
    })
  })
}

/**
 * Delete all catalog entries with 0 row_count
 */
export function deleteZeroRowEntries(): Effect.Effect<number, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        const result = await db
          .deleteFrom('export_catalog' as any)
          .where('row_count', '=', 0)
          .execute()

        return result.length
      },
      catch: cause => databaseError('delete_zero_row_entries', cause),
    })
  })
}

/**
 * Map database row to ExportCatalogEntry
 */
function mapRowToEntry(row: any): ExportCatalogEntry {
  return {
    catalogType: row.catalog_type || row.catalogType,
    deviceUuid: row.device_uuid || row.deviceUuid,
    bucketTs: row.bucket_ts || row.bucketTs,
    format: row.format,
    year: row.year,
    month: row.month,
    day: row.day,
    hour: row.hour,
    path: row.path,
    filename: row.filename,
    fromTs: row.from_ts || row.fromTs,
    toTs: row.to_ts || row.toTs,
    rowCount: row.row_count || row.rowCount,
    sizeEstimate: Number(row.size_estimate || row.sizeEstimate || 0),
    firstTime: row.first_time || row.firstTime || null,
    lastTime: row.last_time || row.lastTime || null,
    finalized: row.finalized,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    extras: (row.extras as Record<string, unknown>) || {},
  }
}
