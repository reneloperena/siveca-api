import type { NewTelemetryPoint } from '../../services/postgres/service'
import { Effect } from 'effect'

/**
 * SenML record from MQTT payload
 */
export type SenMLRecord = {
  bn?: string
  bt?: number
  bver?: number
  n:
    | 'temp'
    | 'hum'
    | 'pres'
    | 'pm1'
    | 'pm25'
    | 'pm10'
    | 'no'
    | 'no2'
    | 'o3'
    | 'so2'
    | 'co'
    | 'h2s'
    | 'nh3'
    | 'co2'
    | 'voc'
    | 'noise'
    | 'solar_rad'
    | 'rain_rate'
    | 'wind_dir'
    | 'wind_spd'
    | 'lux'
  u?: string
  v?: number
  vs?: string
  vb?: boolean
  t?: number
}

/**
 * Device info from MQTT payload
 */
export type DeviceInfo = {
  uuid: string
  fw_ver: string
  model?: string
}

/**
 * MQTT payload structure
 */
export type TelemetryPayload = {
  device_info: DeviceInfo
  measures: SenMLRecord[]
}

/**
 * Converts SenML payload to database format (wide format)
 * Handles 0 vs null: 0 values are stored as 0, missing/undefined values are null
 */
export function senmlToDbNew(
  payload: TelemetryPayload,
  ingestionTime: Date,
): Effect.Effect<NewTelemetryPoint, never, never> {
  const { device_info, measures } = payload

  // Calculate timestamp from base time and offsets
  // If base time (bt) is provided, use it; otherwise use ingestion time
  const baseTime = measures[0]?.bt
    ? new Date(measures[0].bt * 1000)
    : ingestionTime

  // Initialize the telemetry point with device info
  const point: NewTelemetryPoint = {
    time: baseTime,
    deviceUuid: device_info.uuid,
    fwVer: device_info.fw_ver ?? null,
    model: device_info.model ?? null,
    ingestedAt: ingestionTime,
    temp: null,
    hum: null,
    pres: null,
    pm1: null,
    pm25: null,
    pm10: null,
    no: null,
    no2: null,
    o3: null,
    so2: null,
    co: null,
    h2s: null,
    nh3: null,
    co2: null,
    voc: null,
    noise: null,
    solarRad: null,
    rainRate: null,
    windDir: null,
    windSpd: null,
    lux: null,
    extras: {},
  }

  // Process each measure and populate the wide format
  for (const measure of measures) {
    // Calculate timestamp for this measure (base time + offset)
    const measureTime = measure.t !== undefined
      ? new Date((baseTime.getTime() / 1000 + measure.t) * 1000)
      : baseTime

    // Update the point's time to the latest measure time
    if (measureTime > point.time) {
      point.time = measureTime
    }

    // Extract value: use 'v' for numeric, 'vs' for string, 'vb' for boolean
    // For numeric values, 0 is a valid value (not null)
    // Only null/undefined should be stored as null, 0 should be stored as 0
    let value: number | null = null
    if (measure.v !== undefined) {
      value = measure.v // 0 is a valid value
    } else if (measure.vs !== undefined) {
      const parsed = parseFloat(measure.vs)
      value = isNaN(parsed) ? null : parsed
    } else if (measure.vb !== undefined) {
      value = measure.vb ? 1 : 0
    }

    // Map measure name to database column
    // Set value (including 0) or leave as null if value is null/undefined
    switch (measure.n) {
      case 'temp':
        point.temp = value
        break
      case 'hum':
        point.hum = value
        break
      case 'pres':
        point.pres = value
        break
      case 'pm1':
        point.pm1 = value
        break
      case 'pm25':
        point.pm25 = value
        break
      case 'pm10':
        point.pm10 = value
        break
      case 'no':
        point.no = value
        break
      case 'no2':
        point.no2 = value
        break
      case 'o3':
        point.o3 = value
        break
      case 'so2':
        point.so2 = value
        break
      case 'co':
        point.co = value
        break
      case 'h2s':
        point.h2s = value
        break
      case 'nh3':
        point.nh3 = value
        break
      case 'co2':
        point.co2 = value
        break
      case 'voc':
        point.voc = value
        break
      case 'noise':
        point.noise = value
        break
      case 'solar_rad':
        point.solarRad = value
        break
      case 'rain_rate':
        point.rainRate = value
        break
      case 'wind_dir':
        point.windDir = value
        break
      case 'wind_spd':
        point.windSpd = value
        break
      case 'lux':
        point.lux = value
        break
      default:
        // Unknown measure name goes to extras
        if (value !== null && value !== undefined) {
          point.extras[measure.n] = value
        }
    }
  }

  return Effect.succeed(point)
}
