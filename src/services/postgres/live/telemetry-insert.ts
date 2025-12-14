import type { DatabaseService } from './db'
import type { NewTelemetryPoint } from '../service'
import { Effect } from 'effect'
import { DatabaseServiceTag } from './db'
import { databaseError } from '../../../errors'

/**
 * Insert a telemetry point into the database
 */
export function insertTelemetry(
  point: NewTelemetryPoint,
): Effect.Effect<void, any, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag

    return yield* Effect.tryPromise({
      try: async () => {
        await db
          .insertInto('telemetry_raw' as any)
          .values({
            time: point.time,
            device_uuid: point.deviceUuid,
            fw_ver: point.fwVer,
            model: point.model,
            ingested_at: point.ingestedAt,
            temp: point.temp,
            hum: point.hum,
            pres: point.pres,
            pm1: point.pm1,
            pm25: point.pm25,
            pm10: point.pm10,
            no: point.no,
            no2: point.no2,
            o3: point.o3,
            so2: point.so2,
            co: point.co,
            h2s: point.h2s,
            nh3: point.nh3,
            co2: point.co2,
            voc: point.voc,
            noise: point.noise,
            solar_rad: point.solarRad,
            rain_rate: point.rainRate,
            wind_dir: point.windDir,
            wind_spd: point.windSpd,
            lux: point.lux,
            extras: point.extras,
          })
          .execute()
      },
      catch: cause => databaseError('insert_telemetry', cause),
    })
  })
}
