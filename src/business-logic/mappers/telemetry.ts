import type { TelemetryPoint } from '../../services/postgres/service'
import { Effect } from 'effect'

/**
 * API representation of a telemetry point
 */
export type TelemetryPointApi = {
  time: string // ISO 8601 timestamp
  deviceUuid: string
  fwVer: string | null
  model: string | null
  ingestedAt: string // ISO 8601 timestamp
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
 * Transforms database telemetry point to API format
 */
export function toApi(telemetry: TelemetryPoint): Effect.Effect<TelemetryPointApi, never, never> {
  return Effect.succeed({
    time: telemetry.time.toISOString(),
    deviceUuid: telemetry.deviceUuid,
    fwVer: telemetry.fwVer,
    model: telemetry.model,
    ingestedAt: telemetry.ingestedAt.toISOString(),
    temp: telemetry.temp,
    hum: telemetry.hum,
    pres: telemetry.pres,
    pm1: telemetry.pm1,
    pm25: telemetry.pm25,
    pm10: telemetry.pm10,
    no: telemetry.no,
    no2: telemetry.no2,
    o3: telemetry.o3,
    so2: telemetry.so2,
    co: telemetry.co,
    h2s: telemetry.h2s,
    nh3: telemetry.nh3,
    co2: telemetry.co2,
    voc: telemetry.voc,
    noise: telemetry.noise,
    solarRad: telemetry.solarRad,
    rainRate: telemetry.rainRate,
    windDir: telemetry.windDir,
    windSpd: telemetry.windSpd,
    lux: telemetry.lux,
    extras: telemetry.extras,
  })
}
