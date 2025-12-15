import type { DatabaseService } from './db'
import type { TelemetryPoint, TelemetryQueryParams } from '../service'
import { Effect } from 'effect'
import { sql } from 'kysely'
import { DatabaseServiceTag } from './db'
import { databaseError } from '../../../errors'

/**
 * Query telemetry data with filtering and cursor-based pagination
 */
export function queryTelemetry(
  params: TelemetryQueryParams,
): Effect.Effect<TelemetryPoint[], any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        // Note: Using explicit column selection to ensure proper mapping
        // CamelCasePlugin will convert snake_case DB columns to camelCase in results
        let query = db
          .selectFrom('telemetry_raw' as any) // Use snake_case table name
          .select([
            'cursor_id',
            'time',
            'device_uuid',
            'fw_ver',
            'model',
            'ingested_at',
            'temp',
            'hum',
            'pres',
            'pm1',
            'pm25',
            'pm10',
            'no',
            'no2',
            'o3',
            'so2',
            'co',
            'h2s',
            'nh3',
            'co2',
            'voc',
            'noise',
            'solar_rad',
            'rain_rate',
            'wind_dir',
            'wind_spd',
            'lux',
            'extras',
          ])
          .where('time', '>=', params.startTime)
          .where('time', '<=', params.endTime)

        // Filter by device UUID if provided
        if (params.deviceUuid) {
          query = query.where('device_uuid' as any, '=', params.deviceUuid)
        }

        // Cursor-based pagination using cursor_id UUID
        // We need to look up the cursor row's time to filter correctly since we order by time
        if (params.isBackward && params.beforeCursor) {
          // For backward pagination, we need to find rows before the cursor's time
          // First, get the time and cursor_id of the cursor row
          const cursorRow = await db
            .selectFrom('telemetry_raw' as any)
            .select(['time', 'cursor_id'])
            .where('cursor_id' as any, '=', params.beforeCursor)
            .executeTakeFirst()

          if (cursorRow) {
            // Filter: (time < cursor_time) OR (time = cursor_time AND cursor_id < cursor_id)
            query = query.where(eb =>
              eb.or([
                eb('time' as any, '<', cursorRow.time),
                eb.and([
                  eb('time' as any, '=', cursorRow.time),
                  eb('cursor_id' as any, '<', cursorRow.cursor_id),
                ]),
              ]),
            )
          }
        } else if (params.afterCursor) {
          // For forward pagination, we need to find rows after the cursor's time
          // First, get the time and cursor_id of the cursor row
          const cursorRow = await db
            .selectFrom('telemetry_raw' as any)
            .select(['time', 'cursor_id'])
            .where('cursor_id' as any, '=', params.afterCursor)
            .executeTakeFirst()

          if (cursorRow) {
            // Filter: (time < cursor_time) OR (time = cursor_time AND cursor_id > cursor_id)
            // Note: For DESC ordering, "after" means time < cursor_time
            query = query.where(eb =>
              eb.or([
                eb('time' as any, '<', cursorRow.time),
                eb.and([
                  eb('time' as any, '=', cursorRow.time),
                  eb('cursor_id' as any, '>', cursorRow.cursor_id),
                ]),
              ]),
            )
          }
        }

        // Order by time (desc for newest first, asc for oldest first in backward)
        // Use ingested_at and cursor_id as tiebreakers for stable sorting
        if (params.isBackward) {
          query = query
            .orderBy('time', 'asc')
            .orderBy('ingested_at', 'asc')
            .orderBy('cursor_id', 'asc') // Stable sort
        } else {
          query = query
            .orderBy('time', 'desc')
            .orderBy('ingested_at', 'desc')
            .orderBy('cursor_id', 'asc') // Stable sort
        }
        
        query = query.limit(params.limit)

        const rows = await query.execute()

        // For backward pagination, reverse the results to maintain chronological order
        const orderedRows = params.isBackward ? rows.reverse() : rows

        // Transform rows to TelemetryPoint format
        // CamelCasePlugin converts snake_case DB columns to camelCase in TypeScript
        return orderedRows.map((row: any) => ({
          cursorId: row.cursorId || row.cursor_id,
          time: row.time,
          deviceUuid: row.deviceUuid || row.device_uuid,
          fwVer: row.fwVer ?? row.fw_ver ?? null,
          model: row.model ?? null,
          ingestedAt: row.ingestedAt || row.ingested_at,
          temp: row.temp ?? null,
          hum: row.hum ?? null,
          pres: row.pres ?? null,
          pm1: row.pm1 ?? null,
          pm25: row.pm25 ?? null,
          pm10: row.pm10 ?? null,
          no: row.no ?? null,
          no2: row.no2 ?? null,
          o3: row.o3 ?? null,
          so2: row.so2 ?? null,
          co: row.co ?? null,
          h2s: row.h2s ?? null,
          nh3: row.nh3 ?? null,
          co2: row.co2 ?? null,
          voc: row.voc ?? null,
          noise: row.noise ?? null,
          solarRad: row.solarRad ?? row.solar_rad ?? null,
          rainRate: row.rainRate ?? row.rain_rate ?? null,
          windDir: row.windDir ?? row.wind_dir ?? null,
          windSpd: row.windSpd ?? row.wind_spd ?? null,
          lux: row.lux ?? null,
          extras: (row.extras as Record<string, unknown>) ?? {},
        }))
      },
      catch: cause => databaseError('query_telemetry', cause),
    })
  })
}
